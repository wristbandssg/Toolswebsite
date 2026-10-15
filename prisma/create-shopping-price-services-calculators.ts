// One-time (but safe to re-run) batch setup script: creates 6 service pricing tools
// from the user's shopping list (Shopping Calculators > Pricing, Markup & Seller Fee Calculators).
// See src/lib/calc-engine-shopping-price-services.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-price-services-calculators.ts
// or
//   npm run db:create-shopping-price-services-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Pricing, Markup & Seller Fee Calculators", slug: "pricing-markup-seller-fee-calculators" };

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
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
    max: opts.max ?? 1000,
    step: opts.step ?? 1,
  };
}

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "percentage", unit: "%", required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 0.1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000, step: opts.step ?? 1 };
}

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; currency?: string; decimals?: number };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const TOOLS: ToolDef[] = [
  {
    slug: "photography-pricing-calculator",
    title: "Photography Pricing Calculator",
    description: "Set your photography session price from your yearly business costs, the salary you want, taxes and how many sessions you book — the cost of doing business method.",
    metaTitle: "Photography Pricing Calculator — Session Price",
    metaDescription: "Free photography pricing calculator. Price sessions from your cost of doing business, salary goal, taxes and bookings, plus your real hourly rate.",
    calcInputs: [
      currencyField("yearlyExpenses", "Yearly Business Expenses (Gear, Software, Insurance…)", { default: 14000, max: 10000000, step: 100 }),
      currencyField("desiredSalary", "Salary You Want to Take Home", { default: 50000, max: 10000000, step: 1000 }),
      percentField("taxRate", "Income & Self-Employment Tax", { default: 25, max: 60, step: 1 }),
      numberField("sessionsPerYear", "Sessions You Book per Year", { default: 100, min: 1, max: 5000 }),
      currencyField("perSessionCosts", "Per-Session Costs (Travel, Prints, Gallery)", { default: 40, max: 10000, step: 5, required: false }),
      numberField("shootHours", "Shooting Hours per Session", { unit: "hours", default: 1.5, max: 24, step: 0.25 }),
      numberField("editingHours", "Editing Hours per Session", { unit: "hours", default: 3, max: 100, step: 0.25 }),
      numberField("adminHours", "Admin & Communication Hours per Session", { unit: "hours", default: 1, max: 24, step: 0.25, required: false }),
    ],
    calcResult: { label: "Session Price", format: "currency" },
    calcResults: [
      { key: "sessionPrice", label: "Price per Session", format: "currency", highlight: true },
      { key: "costOfBusinessPerSession", label: "Business Costs per Session", format: "currency" },
      { key: "revenueNeededPerYear", label: "Revenue Needed per Year", format: "currency" },
      { key: "totalHoursPerSession", label: "Total Hours per Session", format: "number" },
      { key: "effectiveHourly", label: "Real Hourly Rate", format: "currency" },
    ],
    instructions:
      "Add up a year of business expenses — gear replacement, software, insurance, website, marketing, studio. Enter the salary you want, your tax rate and a realistic number of sessions per year.\n\n" +
      "Add per-session costs and the hours each session really takes, including editing and emails.",
    examples: "Example: $14,000 of expenses and a $50,000 salary at 25% tax over 100 sessions means charging $893.33 a session. Across 5.5 hours of work that's $155.15 an hour.",
    assumptions: "Price per session = (expenses + salary) ÷ (1 − tax rate) ÷ sessions + per-session costs. Most photographers book far fewer sessions than they expect — 50 to 150 a year is common part-time to full-time — so be conservative.",
    faq: [
      { question: "How should a photographer set prices?", answer: "Work out your cost of doing business and income goal for the year, divide by the number of sessions you can realistically book, then add per-session costs." },
      { question: "Why does a one-hour shoot cost so much?", answer: "Each hour of shooting brings 2–4 hours of editing, emails and delivery, plus thousands of dollars a year in gear and business costs." },
    ],
  },
  {
    slug: "babysitting-rate-calculator",
    title: "Babysitting Rate Calculator",
    description: "Work out a fair babysitting rate and total pay — base hourly rate plus extra for more children, CPR and first aid training, extra duties and late-night hours.",
    metaTitle: "Babysitting Rate Calculator — How Much to Pay",
    metaDescription: "Free babysitting rate calculator. Find a fair hourly rate and total pay with extra for more kids, certifications, duties and late nights.",
    calcInputs: [
      currencyField("baseRate", "Base Rate for One Child (Your Area)", { default: 20, max: 200, step: 0.5 }),
      numberField("children", "Number of Children", { default: 3, min: 1, max: 12 }),
      currencyField("perExtraChild", "Extra per Additional Child per Hour", { default: 2, max: 50, step: 0.5 }),
      currencyField("certificationBonus", "Extra for CPR/First Aid or Experience", { default: 1, max: 50, step: 0.5, required: false }),
      currencyField("extraDuties", "Extra for Cooking, Homework, Driving", { default: 1, max: 50, step: 0.5, required: false }),
      numberField("hours", "Hours", { unit: "hours", default: 5, max: 48, step: 0.25 }),
      numberField("lateHours", "Hours After Midnight", { unit: "hours", default: 1, max: 12, step: 0.25, required: false }),
      percentField("latePremium", "Late-Night Premium", { default: 25, max: 100, step: 5, required: false }),
      currencyField("travelFee", "Travel / Gas Contribution", { default: 0, max: 200, step: 1, required: false }),
    ],
    calcResult: { label: "Hourly Rate", format: "currency" },
    calcResults: [
      { key: "hourlyRate", label: "Hourly Rate", format: "currency", highlight: true },
      { key: "totalPay", label: "Total Pay", format: "currency" },
      { key: "lateNightExtra", label: "Late-Night Extra", format: "currency" },
      { key: "perChildPerHour", label: "Rate per Child per Hour", format: "currency" },
      { key: "tipAt15Percent", label: "Optional 15% Tip", format: "currency" },
    ],
    instructions:
      "Start with the going rate for one child in your area, then add a few dollars an hour for each extra child and for certifications or experience. Add extra for cooking, homework help or driving.\n\n" +
      "Enter the hours, any hours after midnight with a premium, and a travel contribution if the sitter drives far.",
    examples: "Example: a $20 base rate with three children (+$2 each for two more), $1 for CPR training and $1 for cooking makes $26.00 an hour. Five hours with one after midnight at a 25% premium totals $136.50.",
    assumptions: "US babysitting rates in 2026 commonly run $18–$25 an hour for one child, higher in big cities. Holidays and last-minute bookings often pay 1.5×. Families who pay a regular sitter over the IRS threshold may owe household employment taxes.",
    faq: [
      { question: "How much should I pay a babysitter?", answer: "Around $18 to $25 an hour for one child in most US areas, plus about $1–$3 an hour for each additional child." },
      { question: "Do you pay a babysitter more after midnight?", answer: "Many families add 20–50% for late-night hours or round up the total, and cover a ride home." },
    ],
  },
  {
    slug: "janitorial-bid-calculator",
    title: "Janitorial Bid Calculator",
    description: "Build a commercial cleaning bid from the square footage and production rate — hours per visit, burdened labor, supplies, overhead and profit — as a monthly price.",
    metaTitle: "Janitorial Bid Calculator — Commercial Cleaning",
    metaDescription: "Free janitorial bid calculator. Bid commercial cleaning jobs from square feet, production rate, labor, supplies, overhead and profit margin.",
    calcInputs: [
      numberField("squareFeet", "Cleanable Square Feet", { unit: "sq ft", default: 12000, max: 10000000, step: 100 }),
      numberField("productionRate", "Production Rate", { unit: "sq ft/hour", default: 2500, max: 10000, step: 100 }),
      numberField("visitsPerMonth", "Cleanings per Month", { default: 21.7, max: 100, step: 0.1 }),
      currencyField("wage", "Cleaner's Hourly Wage", { default: 17, max: 200, step: 0.25 }),
      percentField("burdenPercent", "Labor Burden (Taxes, Insurance)", { default: 20, max: 60, step: 1 }),
      percentField("suppliesPercent", "Supplies & Equipment (% of Labor)", { default: 8, max: 30, step: 1 }),
      percentField("overheadPercent", "Overhead", { default: 12, max: 40, step: 1 }),
      percentField("profitMargin", "Profit Margin", { default: 15, max: 50, step: 1 }),
    ],
    calcResult: { label: "Monthly Bid", format: "currency" },
    calcResults: [
      { key: "monthlyBid", label: "Monthly Bid", format: "currency", highlight: true },
      { key: "pricePerVisit", label: "Price per Cleaning", format: "currency" },
      { key: "pricePerSqFtMonthly", label: "Price per Sq Ft per Month", format: "currency", decimals: 3 },
      { key: "hoursPerVisit", label: "Hours per Cleaning", format: "number" },
      { key: "monthlyLaborCost", label: "Monthly Labor Cost", format: "currency" },
      { key: "monthlyProfit", label: "Monthly Profit", format: "currency" },
    ],
    instructions:
      "Enter the cleanable square feet and your crew's production rate (offices 2,000–4,000 sq ft an hour; restrooms and medical spaces much slower). Enter cleanings per month — 21.7 is five nights a week.\n\n" +
      "Add the wage, burden, supplies, overhead and the profit margin you need.",
    examples: "Example: 12,000 sq ft at 2,500 sq ft an hour takes 4.8 hours a night. Five nights a week with a $17 wage and the defaults, the bid is $3,023.81 a month — $0.252 per square foot.",
    assumptions: "Hours per visit = square feet ÷ production rate. Commercial cleaning bids commonly land at about $0.10–$0.30 per sq ft per month for five-night office cleaning (less for fewer visits); heavy-use or specialised spaces cost more. Do a walkthrough before bidding.",
    faq: [
      { question: "How do you bid a janitorial contract?", answer: "Estimate the hours from square footage and production rate, cost the labor with burden, add supplies and overhead, then add your profit margin." },
      { question: "What is a good production rate for office cleaning?", answer: "About 2,000 to 4,000 square feet per hour for routine office cleaning, depending on clutter, restrooms and flooring." },
    ],
  },
  {
    slug: "lawn-care-pricing-calculator",
    title: "Lawn Care Pricing Calculator",
    description: "Price lawn mowing jobs from lawn size, mowing and trimming time, travel, equipment cost and profit — per visit, per month and for the season.",
    metaTitle: "Lawn Care Pricing Calculator — Price per Mow",
    metaDescription: "Free lawn care pricing calculator. Price mowing by lawn size, time, travel, equipment and profit, with monthly and seasonal totals.",
    calcInputs: [
      numberField("lawnSqFt", "Lawn Size", { unit: "sq ft", default: 8000, max: 1000000, step: 100 }),
      numberField("minutesPer1000", "Mowing Time per 1,000 Sq Ft", { unit: "minutes", default: 3, max: 30, step: 0.5 }),
      numberField("trimMinutes", "Trimming, Edging & Blowing", { unit: "minutes", default: 15, max: 240 }),
      numberField("travelMinutes", "Travel & Setup", { unit: "minutes", default: 10, max: 120 }),
      currencyField("hourlyRate", "Labor Rate per Hour", { default: 40, max: 500, step: 1 }),
      currencyField("equipmentPerVisit", "Fuel & Equipment per Visit", { default: 4, max: 200, step: 0.5, required: false }),
      percentField("profitPercent", "Profit", { default: 20, max: 200, step: 1 }),
      currencyField("minimumCharge", "Minimum Charge", { default: 40, max: 500, step: 5, required: false }),
      numberField("visitsPerMonth", "Visits per Month", { default: 4, max: 10, step: 0.5 }),
      numberField("seasonMonths", "Months in the Season", { default: 7, max: 12, step: 0.5 }),
    ],
    calcResult: { label: "Price per Visit", format: "currency" },
    calcResults: [
      { key: "pricePerVisit", label: "Price per Visit", format: "currency", highlight: true },
      { key: "monthlyPrice", label: "Monthly Price", format: "currency" },
      { key: "seasonPrice", label: "Season Price", format: "currency" },
      { key: "minutesPerVisit", label: "Minutes per Visit", format: "number" },
      { key: "pricePer1000SqFt", label: "Price per 1,000 Sq Ft", format: "currency" },
    ],
    instructions:
      "Enter the lawn size and how long your mower takes per 1,000 sq ft (a 48–60 in zero-turn is about 1–2 minutes; a push mower 5–8), plus trimming and travel time.\n\n" +
      "Add your labor rate, equipment cost per visit, profit and minimum charge, and how often you mow.",
    examples: "Example: an 8,000 sq ft lawn at 3 minutes per 1,000 sq ft with 15 minutes of trimming and 10 of travel takes 49 minutes. At $40 an hour plus $4 of fuel and 20% profit, charge $44.00 a visit — $1,232.00 for a 7-month season.",
    assumptions: "Price = (minutes ÷ 60 × rate + equipment) × (1 + profit), never below the minimum. Typical residential mowing runs $35–$75 per visit for a quarter to half acre. Fertilizing, leaf cleanup and aeration are priced separately.",
    faq: [
      { question: "How much should I charge to mow a lawn?", answer: "Most residential lawns are $35 to $75 per visit, based on size, obstacles and travel. Pricing by time keeps jobs profitable." },
      { question: "How do lawn care companies price per square foot?", answer: "Often around $4–$8 per 1,000 sq ft for mowing, with a minimum charge for small lawns." },
    ],
  },
  {
    slug: "handyman-pricing-calculator",
    title: "Handyman Pricing Calculator",
    description: "Price a handyman job from the hours (with a minimum charge), your hourly rate, materials with markup and a trip fee — or estimate what a handyman will charge.",
    metaTitle: "Handyman Pricing Calculator — Job Price",
    metaDescription: "Free handyman pricing calculator. Price a handyman job from hours, minimum charge, hourly rate, marked-up materials and trip fee.",
    calcInputs: [
      numberField("hours", "Estimated Hours", { unit: "hours", default: 2.5, max: 200, step: 0.25 }),
      numberField("minimumHours", "Minimum Billable Hours", { unit: "hours", default: 2, max: 8, step: 0.5, required: false }),
      currencyField("hourlyRate", "Hourly Rate", { default: 75, max: 500, step: 1 }),
      currencyField("materials", "Materials Cost", { default: 60, max: 100000, step: 1, required: false }),
      percentField("materialMarkup", "Materials Markup", { default: 20, max: 100, step: 1, required: false }),
      currencyField("tripFee", "Trip / Service Call Fee", { default: 0, max: 500, step: 5, required: false }),
    ],
    calcResult: { label: "Job Price", format: "currency" },
    calcResults: [
      { key: "jobPrice", label: "Job Price", format: "currency", highlight: true },
      { key: "laborCharge", label: "Labor", format: "currency" },
      { key: "materialsCharge", label: "Materials (Marked Up)", format: "currency" },
      { key: "hoursBilled", label: "Hours Billed", format: "number" },
      { key: "materialsProfit", label: "Profit on Materials", format: "currency" },
    ],
    instructions:
      "Enter the hours you expect the job to take, your minimum charge in hours, and your hourly rate. Add materials, your markup on them and any trip fee.",
    examples: "Example: a 2.5-hour job at $75 an hour with $60 of materials marked up 20% comes to $259.50.",
    assumptions: "Handymen typically charge $60–$125 an hour in 2026, with a one- or two-hour minimum, or a flat price per task. Work that needs a licensed electrician or plumber may legally require one in your state.",
    faq: [
      { question: "How much does a handyman charge per hour?", answer: "Usually $60 to $125 an hour, depending on your area and the handyman's experience, often with a minimum charge." },
      { question: "Should a handyman mark up materials?", answer: "Many add 10–25% to cover shopping time, transport and the risk of returns." },
    ],
  },
  {
    slug: "nail-pricing-calculator",
    title: "Nail Pricing Calculator",
    description: "Set prices for nail services — gel, acrylic, dip or pedicures — from product cost, appointment time, the hourly earnings you want and booth rent per client.",
    metaTitle: "Nail Pricing Calculator — Price Your Nail Services",
    metaDescription: "Free nail pricing calculator for nail techs. Price gel, acrylic and pedicure services from product cost, time, hourly goal and booth rent.",
    calcInputs: [
      currencyField("productCost", "Product Cost per Service", { default: 6, max: 500, step: 0.25 }),
      numberField("minutes", "Appointment Time", { unit: "minutes", default: 75, max: 480, step: 5 }),
      currencyField("targetHourly", "Hourly Earnings You Want", { default: 35, max: 500, step: 1 }),
      currencyField("boothRent", "Booth Rent or Suite Cost per Month", { default: 900, max: 100000, step: 10, required: false }),
      numberField("clientsPerMonth", "Clients per Month", { default: 80, min: 1, max: 2000, required: false }),
      percentField("profitPercent", "Profit / Buffer", { default: 10, max: 100, step: 1, required: false }),
    ],
    calcResult: { label: "Service Price", format: "currency" },
    calcResults: [
      { key: "servicePrice", label: "Service Price", format: "currency", highlight: true },
      { key: "roundedPrice", label: "Rounded Menu Price ($)", format: "number" },
      { key: "productCost", label: "Product Cost", format: "currency" },
      { key: "rentPerClient", label: "Rent per Client", format: "currency" },
      { key: "earningsPerHour", label: "What You Earn per Hour", format: "currency" },
    ],
    instructions:
      "Enter the product used in the service (gel, acrylic powder, tips, files, disposables), how long the appointment takes and the hourly earnings you want. Add your booth rent and clients per month, plus a profit buffer.",
    examples: "Example: a 75-minute gel full set using $6 of product, aiming for $35 an hour, with $900 rent spread over 80 clients and a 10% buffer: price it at $67.10, about $70 on the menu.",
    assumptions: "Price = (product + time × target hourly + rent per client) × (1 + buffer). Check local competitors — price for your skill level and add-ons like nail art, long length or removal separately.",
    faq: [
      { question: "How do nail techs set their prices?", answer: "By covering product cost, their time at a target hourly rate and their share of rent or overhead, then checking local competitors." },
      { question: "How much should I charge for a gel full set?", answer: "Commonly $45–$80 depending on your area, experience and time per set, plus extra for art and length." },
    ],
  },
];

async function ensureCategory() {
  let main = await prisma.toolCategory.findUnique({ where: { slug: MAIN_CATEGORY.slug } });
  if (!main) {
    console.log(`Creating main category "${MAIN_CATEGORY.name}".`);
    main = await prisma.toolCategory.create({
      data: { ...MAIN_CATEGORY, parentId: null, templateKey: "category-template-1", viewStyle: "grid" },
    });
  }
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  console.log(`Creating sub-category "${CATEGORY.name}" under "${main.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: main.id, templateKey: "category-template-1", viewStyle: "grid" },
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
  console.log("New tools are created with status Draft — review them in /admin/tools and publish when ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
