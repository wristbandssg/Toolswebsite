// One-time (but safe to re-run) batch setup script: creates the Rental & Transport Alternatives tools
// (7) of the Car & Vehicle Cost Calculators expansion, filed under Car & Vehicle
// Cost Calculators > Car Lease, Rental & Transport Calculators (both categories are created on first run).
// See src/lib/calc-engine-car-alternatives.ts for the math and
// src/lib/calc-engine-car-buying.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-car-alternatives-calculators.ts
// or
//   npm run db:create-car-alternatives-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Car & Vehicle Cost Calculators", slug: "car-vehicle-cost-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Car Lease, Rental & Transport Calculators", slug: "car-lease-rental-transport-calculators" };

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
  "This tool provides general estimates for informational purposes only and isn't financial, tax or legal " +
  "advice. Prices, fees, taxes and rates vary by vehicle, dealer, location and provider — check current " +
  "quotes and your state or local rules for exact figures.";

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
    slug: "car-rental-cost-calculator",
    title: "Car Rental Cost Calculator",
    description: "Estimate the full cost of a rental car — daily rate, taxes and airport fees, damage and liability waivers, and extras — and what you save by declining waivers you don't need.",
    metaTitle: "Car Rental Cost Calculator — Total Cost with Fees",
    metaDescription: "Free car rental cost calculator. Add taxes, airport fees, collision damage waivers and extras to find your real rental cost.",
    calcInputs: [
      currencyField("dailyRate", "Daily Rate", { default: 55, max: 10000, step: 1 }),
      numberField("days", "Rental Days", { default: 5, min: 1, max: 365, step: 1 }),
      percentField("taxesFeesPercent", "Taxes & Airport Fees", { default: 20, max: 60, step: 1 }),
      currencyField("damageWaiverPerDay", "Collision / Loss Damage Waiver per Day", { default: 25, max: 500, step: 1 }),
      currencyField("liabilityPerDay", "Supplemental Liability per Day", { default: 15, max: 500, step: 1 }),
      {
        key: "buyWaivers", label: "Buy the Rental Company's Waivers?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes", value: 1 },
          { label: "No — Covered by My Policy or Card", value: 0 },
        ],
      },
      currencyField("extrasPerDay", "Extras per Day (GPS, Child Seat, Young Driver)", { default: 0, max: 500, step: 1, required: false }),
    ],
    calcResult: { label: "Total Rental Cost", format: "currency" },
    calcResults: [
      { key: "baseRental", label: "Base Rental", format: "currency" },
      { key: "taxesAndFees", label: "Taxes & Fees", format: "currency" },
      { key: "waiverCost", label: "Waivers", format: "currency" },
      { key: "totalCost", label: "Total Rental Cost", format: "currency", highlight: true },
      { key: "costPerDay", label: "Real Cost per Day", format: "currency" },
      { key: "savingsByDecliningWaivers", label: "Saved by Declining Waivers", format: "currency" },
    ],
    instructions:
      "Advertised daily rates leave out taxes, airport concession fees and facility charges, which can add 20–40% at " +
      "airports. At the counter you'll also be offered a collision or loss damage waiver (CDW/LDW) and supplemental " +
      "liability, which can double the cost.\n\n" +
      "Your own auto policy often extends liability and sometimes collision to rentals, and many credit cards cover " +
      "collision damage when you pay with the card and decline the waiver. Check both before you go.",
    examples:
      "Example: 5 days at $55 is $275, or $530 with $55 of taxes and fees and " +
      "$200 of waivers — $106 a day.",
    assumptions:
      "Fees as a percentage of the base rate; fuel and tolls not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does my credit card cover rental car insurance?",
        answer: "Many cards include secondary collision coverage, and some primary. It usually excludes liability and certain vehicles and countries.",
      },
    ],
  },
  {
    slug: "car-rental-vs-owning-calculator",
    title: "Car Rental vs Owning Calculator",
    description: "Compare owning a car with going car-free and renting for trips plus rideshare for everyday rides, and find how many rental days make owning worth it.",
    metaTitle: "Car Rental vs Owning Calculator — Do I Need a Car",
    metaDescription: "Free calculator comparing owning a car with renting and rideshare. Find your yearly savings and break-even rental days.",
    calcInputs: [
      numberField("rentalDaysPerYear", "Rental Days per Year", { default: 40, min: 0, max: 365, step: 1 }),
      currencyField("rentalPerDay", "Rental Cost per Day (All-In)", { default: 70, max: 1000, step: 5 }),
      numberField("rideshareTripsPerMonth", "Rideshare / Taxi Trips per Month", { default: 10, min: 0, max: 500, step: 1 }),
      currencyField("rideshareFare", "Average Fare per Trip", { default: 18, max: 1000, step: 1 }),
      currencyField("ownershipCostYearly", "Yearly Cost of Owning a Car", { default: 9500, max: 100000, step: 100 }),
    ],
    calcResult: { label: "Yearly Savings Without a Car", format: "currency" },
    calcResults: [
      { key: "rentalYearly", label: "Rentals per Year", format: "currency" },
      { key: "rideshareYearly", label: "Rideshare per Year", format: "currency" },
      { key: "noCarYearlyCost", label: "Car-Free Yearly Cost", format: "currency" },
      { key: "owningYearlyCost", label: "Owning Yearly Cost", format: "currency" },
      { key: "savingsWithoutCar", label: "Yearly Savings Without a Car", format: "currency", highlight: true },
      { key: "breakEvenRentalDays", label: "Rental Days per Year to Break Even", format: "number" },
    ],
    instructions:
      "Owning a car costs far more than fuel: depreciation, insurance, registration, maintenance, parking and financing " +
      "often total $8,000–$12,000 a year. If you only need a car occasionally, renting for trips and using rideshare or " +
      "transit can cost less.\n\n" +
      "Use the Car Total Cost of Ownership calculator for your own owning cost. A negative savings figure means owning is cheaper.",
    examples:
      "Example: 40 rental days and 10 rideshare trips a month cost $4,960 a year, " +
      "versus $9,500 to own a car — $4,540 saved. Owning only pays off above about 104.86 " +
      "rental days a year.",
    assumptions:
      "Rental and rideshare prices stay the same all year. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What about car sharing services?",
        answer: "Hourly car sharing can be cheaper than rentals for short errands — use its cost per day as the rental cost.",
      },
    ],
  },
  {
    slug: "public-transit-vs-car-calculator",
    title: "Public Transit vs Car Calculator",
    description: "Compare commuting by car with public transit, and the bigger savings of going car-free and selling the car.",
    metaTitle: "Public Transit vs Car Calculator — Commute Savings",
    metaDescription: "Free public transit vs car calculator. Compare commuting costs and see how much a car-free household could save.",
    calcInputs: [
      numberField("commuteDaysPerMonth", "Commute Days per Month", { default: 21, min: 0, max: 31, step: 1 }),
      numberField("roundTripMiles", "Round-Trip Miles", { default: 30, min: 0, max: 500, step: 1 }),
      currencyField("carCostPerMile", "Car Operating Cost per Mile (Fuel, Wear)", { default: 0.3, max: 5, step: 0.01 }),
      currencyField("parkingPerMonth", "Parking per Month", { default: 150, max: 5000, step: 10 }),
      currencyField("transitPassMonthly", "Transit Pass per Month", { default: 100, max: 5000, step: 5 }),
      currencyField("carFixedCostsYearly", "Car Fixed Costs per Year (Insurance, Registration, Depreciation)", { default: 6000, max: 100000, step: 100 }),
      currencyField("rideshareMonthlyIfCarFree", "Rideshare & Rentals per Month If Car-Free", { default: 80, max: 10000, step: 10 }),
    ],
    calcResult: { label: "Yearly Savings with Transit", format: "currency" },
    calcResults: [
      { key: "carCommuteMonthly", label: "Car Commute per Month", format: "currency" },
      { key: "transitMonthly", label: "Transit per Month", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency" },
      { key: "yearlySavingsKeepingCar", label: "Yearly Savings with Transit", format: "currency", highlight: true },
      { key: "yearlySavingsCarFree", label: "Yearly Savings If You Go Car-Free", format: "currency" },
    ],
    instructions:
      "Commuting by car costs fuel and wear on every mile plus parking. Switching to transit saves those costs; selling " +
      "the car entirely also removes insurance, registration and depreciation — the largest savings for a car-free household.\n\n" +
      "Ask your employer about pre-tax transit benefits, which can lower the pass cost further.",
    examples:
      "Example: driving 30 miles round trip 21 days a month with $150 parking costs " +
      "$339 a month vs $100 for transit — $2,868 a year. Going car-free saves $7,908.",
    assumptions:
      "Operating cost per mile excludes fixed costs, which only drop if you sell the car. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are transit passes tax-free?",
        answer: "In the US, employers can provide up to a monthly limit of transit benefits tax-free, or let you pay for passes pre-tax.",
      },
    ],
  },
  {
    slug: "ebike-vs-car-commute-calculator",
    title: "E-Bike vs Car Commute Calculator",
    description: "Compare commuting by e-bike with driving: yearly cost of each, savings, and how quickly an e-bike pays for itself.",
    metaTitle: "E-Bike vs Car Commute Calculator — Savings & Payback",
    metaDescription: "Free e-bike vs car commute calculator. Compare yearly commuting costs and find how fast an e-bike pays for itself.",
    calcInputs: [
      currencyField("ebikePrice", "E-Bike Price", { default: 1800, max: 20000, step: 50 }),
      numberField("ebikeLifeYears", "E-Bike Life (Years)", { default: 5, min: 1, max: 20, step: 1 }),
      currencyField("ebikeUpkeep", "E-Bike Upkeep per Year", { default: 150, max: 5000, step: 10 }),
      numberField("roundTripMiles", "Round-Trip Commute Miles", { default: 12, min: 0, max: 100, step: 1 }),
      numberField("commuteDaysPerYear", "Commute Days per Year", { default: 200, min: 0, max: 366, step: 5 }),
      currencyField("carCostPerMile", "Car Cost per Mile (Fuel, Wear)", { default: 0.35, max: 5, step: 0.01 }),
      currencyField("parkingPerDay", "Car Parking per Day", { default: 5, max: 200, step: 1, required: false }),
      currencyField("electricityRate", "Electricity per kWh", { default: 0.17, max: 2, step: 0.01 }),
    ],
    calcResult: { label: "Yearly Savings", format: "currency" },
    calcResults: [
      { key: "milesPerYear", label: "Commute Miles per Year", format: "number" },
      { key: "carCommuteYearly", label: "Car Commute per Year", format: "currency" },
      { key: "ebikeYearly", label: "E-Bike per Year", format: "currency" },
      { key: "yearlySavings", label: "Yearly Savings", format: "currency", highlight: true },
      { key: "paybackMonths", label: "Months to Pay Off the E-Bike", format: "number" },
    ],
    instructions:
      "E-bikes make commutes of up to about 10–15 miles each way practical, and they use about 0.02 kWh per mile — a " +
      "tiny fraction of a car's fuel cost. Spreading the e-bike's price over its life and adding upkeep (tires, brakes, " +
      "an eventual battery) gives a fair yearly cost.\n\n" +
      "Budget for a good lock, lights and a helmet, and check whether your employer or city offers e-bike incentives.",
    examples:
      "Example: commuting 2,400 miles a year by car costs $1,840 with parking. An e-bike costs about $518.16 " +
      "a year, saving $1,321.84, and pays for itself in about 12.84 months.",
    assumptions:
      "Car fixed costs aren't included; if the e-bike replaces a car entirely, savings are much larger. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is there a tax credit for e-bikes?",
        answer: "There's no federal US e-bike credit, but several states and cities offer rebates or vouchers.",
      },
    ],
  },
  {
    slug: "carpool-savings-calculator",
    title: "Carpool Savings Calculator",
    description: "Calculate how much you save by carpooling to work — fuel, wear, parking and tolls shared among riders — and the CO2 you avoid.",
    metaTitle: "Carpool Savings Calculator — Commute Cost Sharing",
    metaDescription: "Free carpool savings calculator. See your monthly and yearly savings from sharing commute costs, plus CO2 saved.",
    calcInputs: [
      numberField("roundTripMiles", "Round-Trip Miles", { default: 40, min: 0, max: 500, step: 1 }),
      numberField("daysPerMonth", "Commute Days per Month", { default: 20, min: 0, max: 31, step: 1 }),
      numberField("mpg", "Car Fuel Economy (MPG)", { default: 28, min: 1, max: 150, step: 1 }),
      currencyField("gasPrice", "Gas Price per Gallon", { default: 3.4, max: 20, step: 0.05 }),
      currencyField("maintenancePerMile", "Maintenance & Tires per Mile", { default: 0.1, max: 2, step: 0.01 }),
      currencyField("parkingPerMonth", "Parking per Month", { default: 120, max: 5000, step: 10, required: false }),
      currencyField("tollsPerDay", "Tolls per Day", { default: 0, max: 200, step: 1, required: false }),
      numberField("people", "People in the Carpool (Including You)", { default: 3, min: 1, max: 15, step: 1 }),
    ],
    calcResult: { label: "Yearly Savings", format: "currency" },
    calcResults: [
      { key: "soloMonthlyCost", label: "Driving Alone per Month", format: "currency" },
      { key: "carpoolMonthlyCost", label: "Your Carpool Share per Month", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency" },
      { key: "yearlySavings", label: "Yearly Savings", format: "currency", highlight: true },
      { key: "co2SavedLbsPerYear", label: "CO2 Saved per Year (lbs)", format: "number" },
    ],
    instructions:
      "Carpooling splits the cost of fuel, wear, parking and tolls among riders — and many regions give carpools faster " +
      "HOV lanes and discounted tolls or parking. This calculator assumes you take turns driving or split costs evenly.\n\n" +
      "Each gallon of gasoline burned emits about 19.6 lb of CO2.",
    examples:
      "Example: driving 40 miles a day alone costs $297.14 a month. Sharing with 3 people cuts your " +
      "cost to $99.05 — $2,377.14 a year — and avoids about 4,480 lb of CO2.",
    assumptions:
      "Costs split evenly; small detours ignored. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How should carpoolers split costs?",
        answer: "Either rotate driving days or have riders pay the driver a share of fuel, parking and tolls — agree up front.",
      },
    ],
  },
  {
    slug: "airport-parking-vs-rideshare-calculator",
    title: "Airport Parking vs Rideshare Calculator",
    description: "Compare driving and parking at the airport, off-site parking with a shuttle, and taking a rideshare both ways, for the length of your trip.",
    metaTitle: "Airport Parking vs Rideshare Calculator — Cheapest Option",
    metaDescription: "Free airport parking vs rideshare calculator. Compare on-airport and off-site parking with Uber or Lyft for your trip.",
    calcInputs: [
      numberField("tripDays", "Trip Length (Days)", { default: 5, min: 1, max: 60, step: 1 }),
      currencyField("airportParkingPerDay", "Airport Parking per Day", { default: 20, max: 200, step: 1 }),
      currencyField("offsiteParkingPerDay", "Off-Site Parking per Day", { default: 10, max: 200, step: 1 }),
      numberField("milesToAirport", "Miles to the Airport", { default: 20, min: 0, max: 500, step: 1 }),
      currencyField("carCostPerMile", "Car Cost per Mile (Fuel, Wear)", { default: 0.3, max: 5, step: 0.01 }),
      currencyField("rideshareOneWay", "Rideshare Fare One Way", { default: 45, max: 1000, step: 1 }),
      percentField("tipPercent", "Tip", { default: 15, max: 50, step: 1 }),
    ],
    calcResult: { label: "Cheapest Option", format: "currency" },
    calcResults: [
      { key: "onAirportParkingCost", label: "Drive & Park at the Airport", format: "currency" },
      { key: "offsiteParkingCost", label: "Drive & Park Off-Site", format: "currency" },
      { key: "rideshareCost", label: "Rideshare Round Trip", format: "currency" },
      { key: "cheapestCost", label: "Cheapest Option", format: "currency", highlight: true },
      { key: "breakEvenDaysOnAirport", label: "Trip Days When Rideshare Beats Airport Parking", format: "number" },
    ],
    instructions:
      "For short trips, driving and parking is often cheapest; for longer ones, daily parking adds up and a rideshare " +
      "both ways can win. Off-site lots with shuttles are usually about half the price of on-airport parking.\n\n" +
      "Remember surge pricing at peak times and whether someone could drop you off instead.",
    examples:
      "Example: for a 5-day trip, parking at the airport costs $112, off-site parking $62, " +
      "and a rideshare both ways $103.50. Rideshare beats airport parking on trips longer than about 4.57 days.",
    assumptions:
      "Same fare both ways; surge pricing and shuttle tips ignored. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I save on airport parking?",
        answer: "Book off-site or economy lots online in advance — prepaid rates are often much lower than drive-up prices.",
      },
    ],
  },
  {
    slug: "second-car-cost-calculator",
    title: "Second Car Cost Calculator",
    description: "Estimate what a second household car really costs each year — depreciation, insurance, registration, maintenance, fuel and loan interest — versus the rides and rentals it replaces.",
    metaTitle: "Second Car Cost Calculator — Is a Second Car Worth It",
    metaDescription: "Free second car cost calculator. Find the yearly cost of a second household car versus rideshare or rentals.",
    calcInputs: [
      currencyField("carPrice", "Car Price", { default: 15000, max: 1000000, step: 500 }),
      currencyField("downPayment", "Down Payment", { default: 3000, max: 1000000, step: 250 }),
      percentField("loanRatePercent", "Loan Rate (APR)", { default: 8, max: 30, step: 0.1 }),
      numberField("loanTermMonths", "Loan Term (Months)", { default: 48, min: 12, max: 96, step: 12 }),
      percentField("depreciationPercent", "Depreciation per Year", { default: 12, max: 50, step: 1 }),
      currencyField("insurance", "Insurance per Year", { default: 1200, max: 20000, step: 50 }),
      currencyField("registration", "Registration per Year", { default: 150, max: 5000, step: 10 }),
      currencyField("maintenance", "Maintenance per Year", { default: 800, max: 20000, step: 50 }),
      numberField("milesPerYear", "Miles per Year", { default: 6000, min: 0, max: 100000, step: 500 }),
      currencyField("fuelPerMile", "Fuel Cost per Mile", { default: 0.14, max: 2, step: 0.01 }),
      currencyField("alternativeYearly", "Yearly Cost of Rideshare/Rentals It Replaces", { default: 2500, max: 100000, step: 100 }),
    ],
    calcResult: { label: "Yearly Cost", format: "currency" },
    calcResults: [
      { key: "depreciation", label: "Depreciation", format: "currency" },
      { key: "loanInterestFirstYear", label: "Loan Interest (First Year)", format: "currency" },
      { key: "fuelCost", label: "Fuel", format: "currency" },
      { key: "yearlyCost", label: "Yearly Cost", format: "currency", highlight: true },
      { key: "monthlyCost", label: "Monthly Cost", format: "currency" },
      { key: "extraCostVsAlternative", label: "Extra Cost vs Rideshare/Rentals", format: "currency" },
    ],
    instructions:
      "A second car brings convenience, but its costs run whether you drive it or not. Insurance for a second car is " +
      "usually cheaper thanks to multi-car discounts; depreciation and interest are the big hidden costs.\n\n" +
      "Compare with what you'd spend on rideshare, transit or occasional rentals for the trips it would cover.",
    examples:
      "Example: a $15,000 second car costs about $5,654.19 in its first year ($471.18 a month), " +
      "$3,154.19 more than the $2,500 of rides and rentals it would replace.",
    assumptions:
      "First-year costs; loan payments' principal isn't a cost (it builds equity). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is insurance cheaper on a second car?",
        answer: "Usually — multi-car discounts of 10–25% are common when both cars are on one policy.",
      },
    ],
  },
];

// Car & Vehicle Cost Calculators (and its sub-categories) are created on first use, under
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
