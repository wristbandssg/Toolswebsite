// One-time (but safe to re-run) batch setup script: creates the Travel Budget tools
// (8) of the Budget Calculators expansion, filed under Budget Calculators >
// Life Events & Travel Budget Calculators (both categories are created on first run).
// See src/lib/calc-engine-budget-travel.ts for the math and
// src/lib/calc-engine-budget-methods.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-budget-travel-calculators.ts
// or
//   npm run db:create-budget-travel-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Budget Calculators", slug: "budget-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Life Events & Travel Budget Calculators", slug: "life-events-travel-budget-calculators" };

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
    slug: "study-abroad-budget-calculator",
    title: "Study Abroad Budget Calculator",
    description: "Budget a semester or year abroad: program fees, housing, flights, visa and insurance, and daily living costs, less scholarships and aid.",
    metaTitle: "Study Abroad Budget Calculator — Semester Abroad Cost",
    metaDescription: "Free study abroad budget calculator. Total program fees, housing, flights, visa and daily costs, subtract aid, and see the cost per month.",
    calcInputs: [
      currencyField("programFee", "Program Fee or Tuition", { default: 12000, max: 1000000, step: 100 }),
      currencyField("housing", "Housing", { default: 4000, max: 1000000, step: 100, required: false }),
      currencyField("flights", "Round-Trip Flights", { default: 1500, max: 100000, step: 50 }),
      currencyField("visaInsurance", "Visa, Passport & Insurance", { default: 600, max: 100000, step: 25, required: false }),
      currencyField("dailyLiving", "Daily Food, Transport & Personal", { default: 30, max: 10000, step: 1 }),
      numberField("days", "Days Abroad", { default: 120, min: 1, max: 730, step: 1 }),
      currencyField("aid", "Scholarships & Aid Applied", { default: 3000, max: 1000000, step: 100, required: false }),
    ],
    calcResult: { label: "Net Cost After Aid", format: "currency" },
    calcResults: [
      { key: "livingCostTotal", label: "Daily Living Total", format: "currency" },
      { key: "totalCost", label: "Total Cost", format: "currency" },
      { key: "netCostAfterAid", label: "Net Cost After Aid", format: "currency", highlight: true },
      { key: "costPerMonth", label: "Cost per Month", format: "currency" },
    ],
    instructions:
      "Study abroad costs depend heavily on the country and program type: exchange programs often charge home tuition, " +
      "while third-party programs bundle fees, housing and excursions. Federal financial aid can usually be applied to " +
      "approved programs, and there are scholarships just for study abroad (such as the Gilman Scholarship).\n\n" +
      "Budget extra for weekend travel — it's often the biggest surprise.",
    examples:
      "Example: a $12,000 program, $4,000 of housing, $1,500 of flights and $30 a day for 120 days " +
      "total $21,700. After $3,000 of scholarships, the net cost is $18,700 — about $4,737.33 a month.",
    assumptions:
      "Costs in US dollars; exchange rates change. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is studying abroad more expensive than a semester at home?",
        answer: "Not always — in some countries, living costs and exchange-program tuition make it cheaper than a semester on a US campus. Flights and travel are the main extras.",
      },
    ],
  },
  {
    slug: "sabbatical-savings-budget-calculator",
    title: "Sabbatical Savings Budget Calculator",
    description: "Plan a sabbatical, career break or gap year: how much you need for months without a paycheck, travel and health insurance, and what to save each month beforehand.",
    metaTitle: "Sabbatical & Gap Year Budget Calculator — Savings Needed",
    metaDescription: "Free sabbatical and gap year calculator. See how much you need for time off work and what to save each month to get there.",
    calcInputs: [
      numberField("months", "Months Off", { default: 6, min: 0, max: 36, step: 1 }),
      currencyField("monthlyLiving", "Monthly Living Costs (Incl. Home Bills)", { default: 3500, max: 1000000, step: 50 }),
      currencyField("travel", "Travel & Activities (Total)", { default: 5000, max: 1000000, step: 100, required: false }),
      currencyField("healthInsurance", "Health Insurance per Month", { default: 600, max: 100000, step: 25, required: false }),
      currencyField("incomeDuring", "Income During the Break (Monthly)", { default: 0, max: 1000000, step: 50, required: false }),
      percentField("cushionPercent", "Safety Cushion", { default: 10, max: 50, step: 5 }),
      numberField("prepMonths", "Months to Save Beforehand", { default: 18, min: 1, max: 120, step: 1 }),
    ],
    calcResult: { label: "Save per Month", format: "currency" },
    calcResults: [
      { key: "sabbaticalCost", label: "Cost of the Break", format: "currency" },
      { key: "totalWithCushion", label: "Total With Cushion", format: "currency" },
      { key: "monthlySavingsNeeded", label: "Save per Month", format: "currency", highlight: true },
    ],
    instructions:
      "Whether it's a paid or unpaid sabbatical, a career break or a gap year, plan for ongoing bills at home (or sublet), " +
      "health insurance (COBRA or a marketplace plan if you leave your job), travel, and a cushion for re-entry — finding " +
      "work again can take a while.\n\n" +
      "Keep your emergency fund separate from the sabbatical fund.",
    examples:
      "Example: 6 months off at $3,500 a month, plus $600 a month for insurance and $5,000 of travel, " +
      "costs $29,600 — $32,560 with a 10% cushion. Saving $1,808.89 a month for " +
      "18 months gets you there.",
    assumptions:
      "Savings earn no interest. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What about retirement contributions during a sabbatical?",
        answer: "They usually pause. If you can, front-load contributions the year before, or contribute to an IRA from savings to stay on track.",
      },
    ],
  },
  {
    slug: "digital-nomad-budget-calculator",
    title: "Digital Nomad Budget Calculator",
    description: "Budget life as a digital nomad: after-tax remote income versus accommodation, coworking, food, travel between cities and insurance — and how much you can save.",
    metaTitle: "Digital Nomad Budget Calculator — Monthly Cost of Living",
    metaDescription: "Free digital nomad budget calculator. Compare remote income after tax with nomad living costs and see your monthly savings.",
    calcInputs: [
      currencyField("income", "Monthly Remote Income", { default: 5000, max: 10000000, step: 50 }),
      percentField("taxPercent", "Taxes (% of Income)", { default: 25, max: 60, step: 1 }),
      currencyField("accommodation", "Accommodation per Month", { default: 1200, max: 100000, step: 25 }),
      currencyField("coworking", "Coworking & Internet", { default: 200, max: 10000, step: 10, required: false }),
      currencyField("food", "Food", { default: 600, max: 10000, step: 25 }),
      currencyField("transport", "Travel Between Cities (Monthly Average)", { default: 300, max: 10000, step: 25, required: false }),
      currencyField("insurance", "Travel & Health Insurance", { default: 150, max: 10000, step: 10, required: false }),
      currencyField("other", "Everything Else", { default: 300, max: 100000, step: 25, required: false }),
    ],
    calcResult: { label: "Monthly Savings", format: "currency" },
    calcResults: [
      { key: "afterTaxIncome", label: "After-Tax Income", format: "currency" },
      { key: "monthlyLivingCost", label: "Monthly Living Cost", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency", highlight: true },
      { key: "savingsRate", label: "Savings Rate", format: "percentage" },
      { key: "yearlySavings", label: "Yearly Savings", format: "currency" },
    ],
    instructions:
      "Living abroad on a remote income can stretch your money in lower-cost cities, but costs add up: short-term rentals " +
      "cost more than leases, plus flights, visas, coworking and international health insurance. US citizens owe US tax " +
      "wherever they live (the foreign earned income exclusion may apply after a year abroad), and some countries tax " +
      "long-term visitors.\n\n" +
      "Enter monthly averages for your current or planned base.",
    examples:
      "Example: $5,000 of remote income is $3,750 after tax. Living costs of $2,750 leave $1,000 " +
      "a month — a 26.67% savings rate, or $12,000 a year.",
    assumptions:
      "Taxes as a flat share of income. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I need a special visa to work remotely abroad?",
        answer: "Many countries now offer digital nomad visas; working on a tourist visa may not be allowed. Check each country's rules before you go.",
      },
    ],
  },
  {
    slug: "per-diem-travel-budget-calculator",
    title: "Per-Diem Travel Budget Calculator",
    description: "Build a business trip budget with per-diem rates: lodging per night and meals & incidentals per day (75% on travel days), plus transportation.",
    metaTitle: "Per Diem Calculator — Business Travel Budget",
    metaDescription: "Free per diem travel calculator. Budget lodging and meals & incidentals per day, with 75% on travel days, plus transportation.",
    calcInputs: [
      numberField("days", "Trip Days (Incl. Travel Days)", { default: 4, min: 1, max: 365, step: 1 }),
      currencyField("lodgingPerNight", "Lodging Rate per Night", { default: 110, max: 10000, step: 1 }),
      currencyField("mealsPerDay", "Meals & Incidentals per Day", { default: 68, max: 1000, step: 1 }),
      currencyField("transportation", "Airfare, Car & Transport", { default: 400, max: 100000, step: 10, required: false }),
      numberField("travelers", "Travelers", { default: 1, min: 1, max: 100, step: 1 }),
    ],
    calcResult: { label: "Total per Traveler", format: "currency" },
    calcResults: [
      { key: "lodgingTotal", label: "Lodging", format: "currency" },
      { key: "mealsAndIncidentals", label: "Meals & Incidentals", format: "currency" },
      { key: "totalPerTraveler", label: "Total per Traveler", format: "currency", highlight: true },
      { key: "totalForAll", label: "Total for All Travelers", format: "currency" },
      { key: "averagePerDay", label: "Average per Day", format: "currency" },
    ],
    instructions:
      "Per diem is a fixed daily allowance for business travel. The US General Services Administration sets federal rates " +
      "by city: the standard rate for most of the continental US is $110 a night for lodging and $68 a day for meals and " +
      "incidentals, with higher rates in many cities. On the first and last travel days, meals are paid at 75%.\n\n" +
      "Look up the rate for your destination on GSA.gov, or enter your company's rates.",
    examples:
      "Example: a 4-day trip at $110 a night and $68 a day of meals and incidentals costs " +
      "$330 for lodging and $238 for meals. With $400 of transport, the trip budget is " +
      "$968.",
    assumptions:
      "One fewer night than days. Lodging taxes are reimbursed separately under federal rules. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are per diem payments taxable?",
        answer: "Not for employees under an accountable plan if they don't exceed the federal rate and you account for the trip; amounts above it are taxable wages.",
      },
    ],
  },
  {
    slug: "family-vacation-budget-calculator",
    title: "Family Vacation Budget Calculator",
    description: "Budget a family vacation: flights per person, lodging, food and activities per day, car rental and extras — total, per person and per day, and what to save monthly.",
    metaTitle: "Family Vacation Budget Calculator — Trip Cost",
    metaDescription: "Free family vacation budget calculator. Total flights, lodging, food, activities and car rental, per person and per day, and monthly savings.",
    calcInputs: [
      numberField("travelers", "Travelers", { default: 4, min: 1, max: 30, step: 1 }),
      currencyField("flightPerPerson", "Flight per Person", { default: 350, max: 100000, step: 10, required: false }),
      numberField("nights", "Nights", { default: 6, min: 0, max: 90, step: 1 }),
      currencyField("lodgingPerNight", "Lodging per Night", { default: 220, max: 100000, step: 10 }),
      currencyField("foodPerPersonPerDay", "Food per Person per Day", { default: 45, max: 1000, step: 5 }),
      currencyField("activitiesPerPersonPerDay", "Activities per Person per Day", { default: 40, max: 1000, step: 5, required: false }),
      currencyField("carPerDay", "Car Rental & Gas per Day", { default: 60, max: 1000, step: 5, required: false }),
      currencyField("extras", "Souvenirs & Extras", { default: 200, max: 100000, step: 25, required: false }),
      numberField("monthsToSave", "Months Until the Trip", { default: 6, min: 1, max: 36, step: 1 }),
    ],
    calcResult: { label: "Total Vacation Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Total Vacation Cost", format: "currency", highlight: true },
      { key: "costPerPerson", label: "Cost per Person", format: "currency" },
      { key: "costPerDay", label: "Cost per Day", format: "currency" },
      { key: "monthlySavingsNeeded", label: "Save per Month", format: "currency" },
    ],
    instructions:
      "Family trips add up per person — flights, food and tickets multiply by everyone going. Booking a rental with a " +
      "kitchen, traveling off-season and choosing a few paid activities balanced with free ones keep costs down.\n\n" +
      "Enter your plan; days are nights + 1.",
    examples:
      "Example: 4 people for 6 nights with $350 flights each, $220 a night for lodging, and " +
      "daily food and activities comes to $5,720 — $1,430 per person. Saving $953.33 a month for " +
      "6 months covers it.",
    assumptions:
      "Kids counted at the same daily cost as adults. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I save on a family vacation?",
        answer: "Travel off-peak, use points and miles, pick lodging with a kitchen, and look for kids-stay-free or kids-eat-free deals.",
      },
    ],
  },
  {
    slug: "road-trip-budget-calculator",
    title: "Road Trip Budget Calculator",
    description: "Plan a road trip budget: fuel cost from miles, mpg and gas price, wear and tear, hotels, food and activities — total, per person and per mile.",
    metaTitle: "Road Trip Budget Calculator — Gas, Hotels & Food",
    metaDescription: "Free road trip calculator. Estimate gas cost from miles and mpg, plus hotels, food, activities and wear — total and per person.",
    calcInputs: [
      numberField("miles", "Total Miles", { default: 1200, min: 0, max: 100000, step: 10 }),
      numberField("mpg", "Fuel Economy (MPG)", { default: 28, min: 1, max: 150, step: 1 }),
      currencyField("gasPrice", "Gas Price per Gallon", { default: 3.4, max: 20, step: 0.05 }),
      currencyField("wearPerMile", "Wear & Tear per Mile", { default: 0.1, max: 2, step: 0.01, required: false }),
      numberField("nights", "Nights", { default: 4, min: 0, max: 365, step: 1 }),
      currencyField("lodgingPerNight", "Lodging per Night", { default: 130, max: 10000, step: 5 }),
      currencyField("foodPerDay", "Food per Day (Group)", { default: 120, max: 10000, step: 5 }),
      currencyField("activities", "Activities & Parks (Total)", { default: 300, max: 100000, step: 10, required: false }),
      numberField("travelers", "Travelers", { default: 2, min: 1, max: 20, step: 1 }),
    ],
    calcResult: { label: "Total Trip Cost", format: "currency" },
    calcResults: [
      { key: "fuelCost", label: "Fuel Cost", format: "currency" },
      { key: "wearAndTear", label: "Wear & Tear", format: "currency" },
      { key: "totalCost", label: "Total Trip Cost", format: "currency", highlight: true },
      { key: "costPerPerson", label: "Cost per Person", format: "currency" },
      { key: "costPerMile", label: "Cost per Mile", format: "currency" },
    ],
    instructions:
      "Gas is usually a small part of a road trip; lodging and food are bigger. Wear and tear — tires, oil, depreciation — " +
      "is a real cost too, roughly 10–15¢ a mile on top of fuel.\n\n" +
      "Enter your route's total miles and your car's real-world mpg (lower with a loaded car, roof box or highway speeds).",
    examples:
      "Example: 1,200 miles at 28 mpg and $3.40 a gallon is $145.71 of gas, plus $120 of wear. With " +
      "4 nights of lodging, food and activities, the trip costs $1,685.71 — $842.86 per person.",
    assumptions:
      "Food for nights + 1 days. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is driving cheaper than flying?",
        answer: "For groups and shorter distances, usually — one car carries everyone. For a solo traveler going far, flying can win once hotels and food on the road are counted.",
      },
    ],
  },
  {
    slug: "international-travel-budget-calculator",
    title: "International Travel Budget Calculator",
    description: "Budget an international trip: flights, lodging and daily spending abroad, foreign transaction fees, and insurance or visas — total, per person and per day.",
    metaTitle: "International Travel Budget Calculator — Trip Abroad",
    metaDescription: "Free international travel budget calculator. Total flights, lodging, daily spending, foreign card fees and insurance per person and per day.",
    calcInputs: [
      numberField("travelers", "Travelers", { default: 2, min: 1, max: 30, step: 1 }),
      currencyField("flightsTotal", "Flights (Total)", { default: 2400, max: 1000000, step: 50 }),
      numberField("nights", "Nights", { default: 7, min: 0, max: 365, step: 1 }),
      currencyField("lodgingPerNight", "Lodging per Night", { default: 200, max: 100000, step: 10 }),
      currencyField("dailyPerPerson", "Daily Spending per Person (in Dollars)", { default: 80, max: 10000, step: 5 }),
      currencyField("insuranceVisa", "Travel Insurance, Visas & Fees", { default: 200, max: 100000, step: 10, required: false }),
      percentField("foreignFeePercent", "Foreign Transaction Fee on Your Card", { default: 3, max: 10, step: 0.5, required: false }),
    ],
    calcResult: { label: "Total Trip Cost", format: "currency" },
    calcResults: [
      { key: "spendingAbroad", label: "Spending Abroad", format: "currency" },
      { key: "foreignTransactionFees", label: "Foreign Transaction Fees", format: "currency" },
      { key: "totalCost", label: "Total Trip Cost", format: "currency", highlight: true },
      { key: "costPerPerson", label: "Cost per Person", format: "currency" },
      { key: "costPerDay", label: "Cost per Day", format: "currency" },
    ],
    instructions:
      "Many credit cards charge a 3% foreign transaction fee on every purchase abroad; a card without one (and declining " +
      "\"dynamic currency conversion\" at checkout) saves that. Daily spending covers food, local transport and " +
      "attractions — use a travel guide's daily budget for your destination.\n\n" +
      "Set the fee to 0 if your card has no foreign transaction fee.",
    examples:
      "Example: 2 travelers with $2,400 of flights, 7 nights at $200 and $80 a " +
      "day each spend $2,680 abroad, plus $80.40 in card fees — $5,360.40 in total, or $670.05 " +
      "a day.",
    assumptions:
      "Lodging and daily spending charged in local currency on a card with the fee shown. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I exchange cash before I travel?",
        answer: "Usually not much — airport exchanges have poor rates. Withdraw local cash from an ATM abroad with a fee-free debit card and use a no-foreign-fee credit card.",
      },
    ],
  },
  {
    slug: "group-trip-expense-split-calculator",
    title: "Group Trip Expense Split Calculator",
    description: "Settle up after a group trip: enter what each person paid, and see the fair share and who owes or is owed money.",
    metaTitle: "Group Trip Expense Split Calculator — Settle Up",
    metaDescription: "Free group trip expense calculator. Enter what each person paid to see the fair share and who owes whom after the trip.",
    calcInputs: [
      numberField("people", "People in the Group (Up to 4)", { default: 4, min: 2, max: 4, step: 1 }),
      currencyField("paidA", "Person A Paid", { default: 800, max: 1000000, step: 5 }),
      currencyField("paidB", "Person B Paid", { default: 300, max: 1000000, step: 5 }),
      currencyField("paidC", "Person C Paid", { default: 150, max: 1000000, step: 5, required: false }),
      currencyField("paidD", "Person D Paid", { default: 0, max: 1000000, step: 5, required: false }),
    ],
    calcResult: { label: "Fair Share per Person", format: "currency" },
    calcResults: [
      { key: "totalSpent", label: "Total Spent", format: "currency" },
      { key: "fairShare", label: "Fair Share per Person", format: "currency", highlight: true },
      { key: "personABalance", label: "Person A (+ Is Owed, − Owes)", format: "currency" },
      { key: "personBBalance", label: "Person B (+ Is Owed, − Owes)", format: "currency" },
      { key: "personCBalance", label: "Person C (+ Is Owed, − Owes)", format: "currency" },
      { key: "personDBalance", label: "Person D (+ Is Owed, − Owes)", format: "currency" },
    ],
    instructions:
      "On group trips, different people pay for lodging, gas and meals. Add up what each person paid in total; everyone's " +
      "fair share is the total divided by the group. Anyone with a negative balance pays that amount to those with a " +
      "positive balance.\n\n" +
      "For larger groups or items not shared by everyone, a bill-splitting app is easier.",
    examples:
      "Example: the group spent $1,250, so each person's share is $312.50. Person A paid more and is owed $487.50; " +
      "Person C owes $162.50 and Person D owes $312.50.",
    assumptions:
      "All costs shared equally. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do we split costs if not everyone joined every activity?",
        answer: "Split those items only among the people who took part, then add each person's share to their total before settling up.",
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
