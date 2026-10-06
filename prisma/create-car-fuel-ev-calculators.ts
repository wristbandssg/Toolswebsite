// One-time (but safe to re-run) batch setup script: creates the Fuel & Electric Vehicle Cost tools
// (11) of the Car & Vehicle Cost Calculators expansion, filed under Car & Vehicle
// Cost Calculators > Car Ownership, Fuel & EV Cost Calculators (both categories are created on first run).
// See src/lib/calc-engine-car-fuel-ev.ts for the math and
// src/lib/calc-engine-car-buying.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-car-fuel-ev-calculators.ts
// or
//   npm run db:create-car-fuel-ev-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Car & Vehicle Cost Calculators", slug: "car-vehicle-cost-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Car Ownership, Fuel & EV Cost Calculators", slug: "car-ownership-fuel-ev-cost-calculators" };

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
    slug: "car-fuel-cost-calculator",
    title: "Car Fuel Cost Calculator",
    description: "Calculate how much you spend on gas each month and year from your miles, fuel economy and gas price, with the cost per mile and per person.",
    metaTitle: "Car Fuel Cost Calculator — Monthly Gas Cost",
    metaDescription: "Free car fuel cost calculator. Find your monthly and yearly gas cost, cost per mile and cost per person.",
    calcInputs: [
      numberField("milesPerMonth", "Miles per Month", { default: 1000, min: 0, max: 100000, step: 50 }),
      numberField("mpg", "Fuel Economy (MPG)", { default: 28, min: 1, max: 150, step: 1 }),
      currencyField("gasPrice", "Gas Price per Gallon", { default: 3.4, max: 20, step: 0.05 }),
      numberField("people", "People Sharing the Cost", { default: 1, min: 1, max: 15, step: 1 }),
    ],
    calcResult: { label: "Monthly Fuel Cost", format: "currency" },
    calcResults: [
      { key: "gallonsPerMonth", label: "Gallons per Month", format: "number" },
      { key: "monthlyFuelCost", label: "Monthly Fuel Cost", format: "currency", highlight: true },
      { key: "yearlyFuelCost", label: "Yearly Fuel Cost", format: "currency" },
      { key: "costPerMile", label: "Fuel Cost per Mile", format: "currency" },
      { key: "costPerPerson", label: "Monthly Cost per Person", format: "currency" },
    ],
    instructions:
      "Fuel cost = miles ÷ MPG × price per gallon. Use your car's real-world MPG — city driving, short trips, heavy " +
      "loads and cold weather all lower it.\n\n" +
      "To price a single trip, enter the trip's miles instead of monthly miles.",
    examples:
      "Example: driving 1,000 miles a month at 28 MPG with gas at $3.40 uses 35.71 gallons — " +
      "$121.43 a month or $1,457.14 a year.",
    assumptions:
      "Steady fuel economy and gas price. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I cut my fuel costs?",
        answer: "Keep tires properly inflated, drive smoothly, combine errands, remove extra weight and use a gas-price app or warehouse club stations.",
      },
    ],
  },
  {
    slug: "gas-mileage-calculator",
    title: "Gas Mileage (MPG) Calculator",
    description: "Calculate your car's real gas mileage (MPG) from miles driven and gallons filled, plus liters per 100 km, km per liter and your cost per mile.",
    metaTitle: "Gas Mileage Calculator — MPG and L/100 km",
    metaDescription: "Free gas mileage calculator. Find your car's MPG from a fill-up, convert to L/100 km and km/L, and see your cost per mile.",
    calcInputs: [
      numberField("milesDriven", "Miles Driven Since Last Fill-Up", { default: 350, min: 0, max: 5000, step: 1 }),
      numberField("gallons", "Gallons to Fill the Tank", { default: 12.5, min: 0, max: 200, step: 0.1 }),
      currencyField("gasPrice", "Gas Price per Gallon", { default: 3.4, max: 20, step: 0.05 }),
    ],
    calcResult: { label: "Miles per Gallon", format: "number" },
    calcResults: [
      { key: "mpg", label: "Miles per Gallon (MPG)", format: "number", highlight: true },
      { key: "litersPer100Km", label: "Liters per 100 km", format: "number" },
      { key: "kmPerLiter", label: "Kilometers per Liter", format: "number" },
      { key: "costOfThisFill", label: "Cost of This Fill-Up", format: "currency" },
      { key: "costPerMile", label: "Fuel Cost per Mile", format: "currency" },
    ],
    instructions:
      "To measure real MPG: fill the tank completely and reset the trip odometer. At your next fill-up, fill completely " +
      "again and note the gallons. MPG = miles driven ÷ gallons.\n\n" +
      "Averaging several tanks gives a more reliable figure than one. L/100 km = 235.215 ÷ MPG.",
    examples:
      "Example: 350 miles on 12.50 gallons is 28 MPG — 8.40 L/100 km. At $3.40 a gallon, " +
      "that's $0.12 per mile.",
    assumptions:
      "US gallons. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is my MPG lower than the EPA rating?",
        answer: "Short trips, idling, aggressive driving, cold weather, roof racks and underinflated tires all reduce real-world MPG.",
      },
    ],
  },
  {
    slug: "fuel-efficiency-comparison-calculator",
    title: "Fuel Efficiency Comparison Calculator",
    description: "Compare the fuel cost of two cars by MPG, and see how long it takes the more efficient car to pay back its higher price.",
    metaTitle: "Fuel Efficiency Comparison Calculator — MPG Savings",
    metaDescription: "Free MPG comparison calculator. Compare two cars' fuel costs and find the payback on a more fuel-efficient car.",
    calcInputs: [
      numberField("mpgA", "Car A Fuel Economy (MPG)", { default: 25, min: 1, max: 150, step: 1 }),
      numberField("mpgB", "Car B Fuel Economy (MPG)", { default: 40, min: 1, max: 150, step: 1 }),
      numberField("milesPerYear", "Miles per Year", { default: 12000, min: 0, max: 100000, step: 500 }),
      currencyField("gasPrice", "Gas Price per Gallon", { default: 3.4, max: 20, step: 0.05 }),
      numberField("years", "Years", { default: 5, min: 1, max: 20, step: 1 }),
      currencyField("priceDifference", "Extra Price of Car B", { default: 3000, max: 1000000, step: 250, required: false }),
    ],
    calcResult: { label: "Yearly Fuel Savings", format: "currency" },
    calcResults: [
      { key: "yearlyFuelCostA", label: "Car A Fuel per Year", format: "currency" },
      { key: "yearlyFuelCostB", label: "Car B Fuel per Year", format: "currency" },
      { key: "yearlySavings", label: "Yearly Fuel Savings", format: "currency", highlight: true },
      { key: "savingsOverYears", label: "Savings over the Years", format: "currency" },
      { key: "paybackYears", label: "Years to Pay Back the Extra Price", format: "number" },
      { key: "netSavingsAfterPriceDifference", label: "Net Savings After Extra Price", format: "currency" },
    ],
    instructions:
      "MPG gains matter most at the low end: going from 15 to 20 MPG saves more fuel than going from 40 to 50. If the " +
      "more efficient car costs more, divide the extra price by the yearly fuel savings to see how long it takes to pay back.",
    examples:
      "Example: driving 12,000 miles a year, a 40-MPG car uses $612 less fuel a year than a 25-MPG car. " +
      "If it costs $3,000 more, it pays back in about 4.90 years.",
    assumptions:
      "Same miles and gas price for both cars. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a hybrid worth the extra cost?",
        answer: "Often, if you drive a lot of city miles — hybrids shine in stop-and-go traffic. Enter your miles to see the payback.",
      },
    ],
  },
  {
    slug: "ev-vs-gas-cost-calculator",
    title: "EV vs Gas Car Cost Calculator",
    description: "Compare the total cost of an electric car, a hybrid and a gas car — purchase price less resale, fuel or charging, and maintenance — over the years you'll own it.",
    metaTitle: "EV vs Gas Car Cost Calculator — Hybrid vs Electric vs Gas",
    metaDescription: "Free EV vs gas car calculator. Compare electric, hybrid and gas car ownership costs with charging, fuel and resale.",
    calcInputs: [
      numberField("milesPerYear", "Miles per Year", { default: 12000, min: 0, max: 100000, step: 500 }),
      numberField("years", "Years of Ownership", { default: 5, min: 1, max: 20, step: 1 }),
      currencyField("gasPrice", "Gas Price per Gallon", { default: 3.4, max: 20, step: 0.05 }),
      currencyField("gasCarPrice", "Gas Car Price", { default: 32000, max: 1000000, step: 500 }),
      numberField("gasMpg", "Gas Car MPG", { default: 30, min: 1, max: 100, step: 1 }),
      currencyField("hybridPrice", "Hybrid Price", { default: 34000, max: 1000000, step: 500 }),
      numberField("hybridMpg", "Hybrid MPG", { default: 50, min: 1, max: 150, step: 1 }),
      currencyField("evPrice", "EV Price", { default: 42000, max: 1000000, step: 500 }),
      numberField("evKwhPer100Miles", "EV Energy Use (kWh per 100 Miles)", { default: 30, min: 10, max: 80, step: 1 }),
      currencyField("homeRate", "Home Electricity per kWh", { default: 0.17, max: 2, step: 0.01 }),
      currencyField("publicRate", "Public Fast Charging per kWh", { default: 0.45, max: 2, step: 0.01 }),
      percentField("publicSharePercent", "Share of Charging Done in Public", { default: 20, max: 100, step: 5 }),
      currencyField("evIncentives", "EV Rebates & Credits", { default: 0, max: 50000, step: 250, required: false }),
      percentField("gasResalePercent", "Gas Car Value Left at the End", { default: 45, max: 100, step: 1 }),
      percentField("hybridResalePercent", "Hybrid Value Left at the End", { default: 50, max: 100, step: 1 }),
      percentField("evResalePercent", "EV Value Left at the End", { default: 40, max: 100, step: 1 }),
    ],
    calcResult: { label: "Lowest Total Cost", format: "currency" },
    calcResults: [
      { key: "gasFuelPerYear", label: "Gas Car Fuel per Year", format: "currency" },
      { key: "hybridFuelPerYear", label: "Hybrid Fuel per Year", format: "currency" },
      { key: "evChargingPerYear", label: "EV Charging per Year", format: "currency" },
      { key: "gasTotalCost", label: "Gas Car Total Cost", format: "currency" },
      { key: "hybridTotalCost", label: "Hybrid Total Cost", format: "currency" },
      { key: "evTotalCost", label: "EV Total Cost", format: "currency" },
      { key: "lowestTotalCost", label: "Lowest Total Cost", format: "currency", highlight: true },
      { key: "evSavingsVsGas", label: "EV Savings vs Gas Car", format: "currency" },
    ],
    instructions:
      "EVs usually cost more to buy but less to run: charging at home costs a fraction of gas, and there are no oil " +
      "changes. Hybrids cut fuel use without charging. Which is cheapest depends on prices, your miles, electricity " +
      "rates, how often you fast-charge, and resale values.\n\n" +
      "The federal EV tax credit ended for vehicles acquired after September 30, 2025; enter any state or utility " +
      "rebates you qualify for. A negative EV savings figure means the gas car is cheaper.",
    examples:
      "Example: over 5 years and 12,000 miles a year, the gas car costs $29,800, the hybrid $25,880 " +
      "and the EV $32,868. EV charging costs $813.60 a year versus $1,360 of gas.",
    assumptions:
      "Maintenance per mile: gas $0.09, hybrid $0.08, EV $0.06; insurance and financing assumed similar. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do EVs really cost less to maintain?",
        answer: "Generally yes — no oil changes, fewer moving parts and less brake wear thanks to regenerative braking — though tires can wear faster.",
      },
    ],
  },
  {
    slug: "ev-charging-cost-calculator",
    title: "EV Charging Cost Calculator",
    description: "Calculate the cost to charge an electric car at home or at public chargers, your EV's range, and your monthly charging cost and cost per mile.",
    metaTitle: "EV Charging Cost Calculator — Cost to Charge & Range",
    metaDescription: "Free EV charging cost calculator. Find the cost per charge at home and in public, your range, and monthly charging cost.",
    calcInputs: [
      numberField("batteryKwh", "Battery Size (kWh)", { default: 75, min: 1, max: 250, step: 1 }),
      numberField("milesPerKwh", "Efficiency (Miles per kWh)", { default: 3.5, min: 0.5, max: 8, step: 0.1 }),
      percentField("fromPercent", "Charge From", { default: 20, max: 100, step: 5 }),
      percentField("toPercent", "Charge To", { default: 80, max: 100, step: 5 }),
      currencyField("homeRate", "Home Electricity per kWh", { default: 0.17, max: 2, step: 0.01 }),
      currencyField("publicRate", "Public Charging per kWh", { default: 0.45, max: 2, step: 0.01 }),
      percentField("lossPercent", "Home Charging Losses", { default: 10, max: 30, step: 1 }),
      numberField("milesPerMonth", "Miles per Month", { default: 1000, min: 0, max: 20000, step: 50 }),
      percentField("publicSharePercent", "Share of Charging Done in Public", { default: 20, max: 100, step: 5 }),
    ],
    calcResult: { label: "Monthly Charging Cost", format: "currency" },
    calcResults: [
      { key: "fullChargeRange", label: "Range on a Full Charge (Miles)", format: "number" },
      { key: "kwhAdded", label: "Energy Added (kWh)", format: "number" },
      { key: "milesAdded", label: "Miles Added", format: "number" },
      { key: "costThisChargeAtHome", label: "Cost of This Charge at Home", format: "currency" },
      { key: "costThisChargePublic", label: "Cost of This Charge in Public", format: "currency" },
      { key: "monthlyChargingCost", label: "Monthly Charging Cost", format: "currency", highlight: true },
      { key: "costPerMile", label: "Charging Cost per Mile", format: "currency" },
    ],
    instructions:
      "An EV's range is its usable battery capacity × efficiency in miles per kWh — and efficiency drops in cold weather " +
      "and at highway speeds. Charging at home is usually much cheaper than public fast charging, though about 10% of " +
      "the energy is lost while charging.\n\n" +
      "Many owners charge to 80% day to day to protect the battery. Time-of-use rates can make overnight charging cheaper still.",
    examples:
      "Example: charging a 75 kWh battery from 20% to 80% adds 45 kWh — about 157.50 miles — for " +
      "$8.50 at home or $20.25 at a public charger. Driving 1,000 miles a month costs about " +
      "$68.89.",
    assumptions:
      "Charging losses applied to home charging only; idle and session fees not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How long does it take to charge an EV?",
        answer: "Overnight on a Level 2 home charger for most daily driving; a DC fast charger can add 150–200 miles in about 20–30 minutes.",
      },
    ],
  },
  {
    slug: "ev-home-charger-installation-calculator",
    title: "EV Home Charger Installation Cost Calculator",
    description: "Estimate the cost of installing a Level 2 EV charger at home — charger, electrician, panel upgrade and permit — and how fast it pays back versus public charging.",
    metaTitle: "EV Home Charger Installation Cost Calculator — Payback",
    metaDescription: "Free EV home charger cost calculator. Estimate Level 2 charger installation cost and the payback versus public charging.",
    calcInputs: [
      currencyField("chargerPrice", "Level 2 Charger Price", { default: 600, max: 10000, step: 25 }),
      currencyField("installLabor", "Electrician Installation", { default: 800, max: 20000, step: 50 }),
      currencyField("panelUpgrade", "Panel or Service Upgrade", { default: 0, max: 20000, step: 100, required: false }),
      currencyField("permit", "Permit & Inspection", { default: 150, max: 5000, step: 25, required: false }),
      currencyField("rebates", "Utility or State Rebates", { default: 0, max: 10000, step: 50, required: false }),
      numberField("milesPerMonth", "Miles per Month", { default: 1000, min: 0, max: 20000, step: 50 }),
      numberField("milesPerKwh", "EV Efficiency (Miles per kWh)", { default: 3.5, min: 0.5, max: 8, step: 0.1 }),
      currencyField("homeRate", "Home Electricity per kWh", { default: 0.17, max: 2, step: 0.01 }),
      currencyField("publicRate", "Public Charging per kWh", { default: 0.45, max: 2, step: 0.01 }),
    ],
    calcResult: { label: "Net Installed Cost", format: "currency" },
    calcResults: [
      { key: "totalInstalledCost", label: "Total Installed Cost", format: "currency" },
      { key: "netCost", label: "Net Installed Cost", format: "currency", highlight: true },
      { key: "monthlySavingsVsPublic", label: "Monthly Savings vs Public Charging", format: "currency" },
      { key: "yearlySavingsVsPublic", label: "Yearly Savings vs Public Charging", format: "currency" },
      { key: "paybackMonths", label: "Months to Pay Back", format: "number" },
    ],
    instructions:
      "A Level 2 charger needs a 240-volt circuit, typically 40–60 amps. Installation is cheapest when the panel is " +
      "close to the parking spot and has spare capacity; long wire runs or a panel upgrade add a lot.\n\n" +
      "The federal 30C charger credit ended for equipment placed in service after June 30, 2026, but many utilities " +
      "still offer rebates or cheaper overnight EV rates. Use a licensed electrician and pull a permit.",
    examples:
      "Example: a $600 charger with $800 of installation and a permit costs $1,550. Charging at home instead of " +
      "public chargers saves about $74.60 a month, paying back in about 20.78 months.",
    assumptions:
      "Home charging includes about 10% energy loss. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I just use a regular outlet?",
        answer: "Level 1 charging on a 120-volt outlet adds only about 3–5 miles per hour — enough for short commutes, but slow.",
      },
    ],
  },
  {
    slug: "home-solar-ev-charging-calculator",
    title: "Home Solar EV Charging Calculator",
    description: "Estimate the solar panels — rooftop or a driveway solar carport — needed to charge your EV with sunshine, their cost, payback and 25-year savings.",
    metaTitle: "Home Solar EV Charging Calculator — Solar Carport Cost",
    metaDescription: "Free solar EV charging calculator. Size solar for your EV, estimate rooftop or carport cost, payback and 25-year savings.",
    calcInputs: [
      numberField("evMilesPerYear", "EV Miles per Year", { default: 12000, min: 0, max: 100000, step: 500 }),
      numberField("milesPerKwh", "EV Efficiency (Miles per kWh)", { default: 3.5, min: 0.5, max: 8, step: 0.1 }),
      numberField("sunHours", "Peak Sun Hours per Day", { default: 4.5, min: 1, max: 8, step: 0.1 }),
      currencyField("costPerWatt", "Installed Solar Cost per Watt", { default: 3, max: 10, step: 0.05 }),
      {
        key: "mounting", label: "Mounting", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Rooftop", value: 1 },
          { label: "Driveway Solar Carport", value: 2 },
        ],
      },
      percentField("creditPercent", "Tax Credits & Rebates (% of Cost)", { default: 0, max: 100, step: 1, required: false }),
      currencyField("utilityRate", "Utility Electricity per kWh", { default: 0.17, max: 2, step: 0.01 }),
      percentField("rateIncreasePercent", "Yearly Electricity Rate Increase", { default: 2.5, max: 15, step: 0.5 }),
    ],
    calcResult: { label: "Payback (Years)", format: "number" },
    calcResults: [
      { key: "evKwhPerYear", label: "EV Electricity per Year (kWh)", format: "number" },
      { key: "solarKwNeeded", label: "Solar Needed (kW)", format: "number" },
      { key: "systemCost", label: "System Cost", format: "currency" },
      { key: "netCost", label: "Net Cost", format: "currency" },
      { key: "firstYearSavings", label: "First-Year Savings", format: "currency" },
      { key: "paybackYears", label: "Payback (Years)", format: "number", highlight: true },
      { key: "netSavingsOver25Years", label: "Net Savings over 25 Years", format: "currency" },
    ],
    instructions:
      "Covering your EV's charging with solar means adding enough panels to make the kWh it uses each year. Each kW of " +
      "panels produces roughly peak sun hours × 365 × 80% (after system losses) kWh a year. A solar carport doubles as " +
      "covered parking but costs more to build than a rooftop system.\n\n" +
      "The federal residential clean energy credit ended for systems placed in service after December 31, 2025; enter " +
      "any state or utility incentives. Net-metering rules affect the value of solar you don't use right away.",
    examples:
      "Example: driving 12,000 EV miles a year uses about 3,428.57 kWh, needing 2.61 kW of rooftop solar costing " +
      "$7,827.79. It saves $582.86 the first year and pays back in about 13.43 years.",
    assumptions:
      "80% system derate; carport mounting costs 40% more; savings valued at the utility rate. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I charge my EV directly from solar?",
        answer: "Most homes charge from the grid and offset it with solar via net metering; daytime charging or a battery lets you use solar directly.",
      },
    ],
  },
  {
    slug: "ev-charging-subscription-calculator",
    title: "EV Charging Network Subscription Calculator",
    description: "Decide whether a public EV charging network membership is worth it — a monthly fee for lower per-kWh rates — and the monthly usage where it pays off.",
    metaTitle: "EV Charging Subscription Calculator — Is It Worth It",
    metaDescription: "Free EV charging membership calculator. Compare a charging network subscription with pay-as-you-go and find the break-even kWh.",
    calcInputs: [
      numberField("kwhPerMonth", "Public Charging per Month (kWh)", { default: 150, min: 0, max: 5000, step: 10 }),
      currencyField("payAsYouGoRate", "Pay-As-You-Go Rate per kWh", { default: 0.48, max: 2, step: 0.01 }),
      currencyField("memberRate", "Member Rate per kWh", { default: 0.36, max: 2, step: 0.01 }),
      currencyField("monthlyFee", "Monthly Membership Fee", { default: 12.99, max: 500, step: 0.5 }),
    ],
    calcResult: { label: "Monthly Savings", format: "currency" },
    calcResults: [
      { key: "payAsYouGoMonthly", label: "Pay-As-You-Go per Month", format: "currency" },
      { key: "membershipMonthly", label: "Membership per Month", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency", highlight: true },
      { key: "yearlySavings", label: "Yearly Savings", format: "currency" },
      { key: "breakEvenKwhPerMonth", label: "Break-Even kWh per Month", format: "number" },
    ],
    instructions:
      "Fast-charging networks offer memberships that lower the per-kWh price for a monthly fee. They pay off only if you " +
      "charge in public often — for example on long commutes, road trips or without home charging.\n\n" +
      "Some networks charge per minute instead of per kWh; convert using your car's typical charging speed. A negative " +
      "savings figure means pay-as-you-go is cheaper.",
    examples:
      "Example: 150 kWh a month costs $72 pay-as-you-go or $66.99 with membership — saving " +
      "$5.01. Membership pays off above about 108.25 kWh a month.",
    assumptions:
      "Session and idle fees not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How many miles is 150 kWh?",
        answer: "About 450–550 miles for a typical EV at 3–3.5 miles per kWh.",
      },
    ],
  },
  {
    slug: "ev-battery-degradation-calculator",
    title: "EV Battery Degradation Calculator",
    description: "Estimate how much battery capacity and range an electric car loses over the years, the value of that lost capacity, and when it would hit the warranty threshold.",
    metaTitle: "EV Battery Degradation Calculator — Range Loss",
    metaDescription: "Free EV battery degradation calculator. Estimate capacity and range loss over time and years until the warranty threshold.",
    calcInputs: [
      numberField("originalRange", "Original Range (Miles)", { default: 300, min: 1, max: 1000, step: 5 }),
      percentField("yearlyLossPercent", "Capacity Lost per Year", { default: 2, max: 20, step: 0.1 }),
      numberField("years", "Battery Age (Years)", { default: 8, min: 0, max: 30, step: 1 }),
      currencyField("replacementCost", "Battery Replacement Cost", { default: 15000, max: 100000, step: 500 }),
      percentField("warrantyMinPercent", "Warranty Capacity Threshold", { default: 70, max: 100, step: 1 }),
    ],
    calcResult: { label: "Capacity Remaining", format: "percentage" },
    calcResults: [
      { key: "capacityRemainingPercent", label: "Capacity Remaining", format: "percentage", highlight: true },
      { key: "rangeNow", label: "Range Now (Miles)", format: "number" },
      { key: "rangeLost", label: "Range Lost (Miles)", format: "number" },
      { key: "valueOfLostCapacity", label: "Value of Lost Capacity", format: "currency" },
      { key: "yearsUntilWarrantyThreshold", label: "Years Until Warranty Threshold", format: "number" },
    ],
    instructions:
      "EV batteries slowly lose capacity — studies of real-world fleets show roughly 1.5–2.5% a year on average, often " +
      "a bit faster at first. Frequent DC fast charging, high heat and regularly charging to 100% speed it up.\n\n" +
      "US EV battery warranties typically cover 8 years or 100,000 miles, with replacement if capacity falls below " +
      "about 70%.",
    examples:
      "Example: losing 2% a year, a battery keeps 85.08% of its capacity after 8 years — " +
      "255.23 of its original 300 miles of range.",
    assumptions:
      "Steady yearly loss rate. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How long do EV batteries last?",
        answer: "Most are expected to outlast the car's typical life, often 12–20 years, with gradual range loss rather than sudden failure.",
      },
    ],
  },
  {
    slug: "ev-tax-credit-calculator",
    title: "EV Tax Credit Calculator",
    description: "Find what EV incentives are worth to you: the federal clean vehicle credit (for EVs acquired by September 30, 2025) plus state and utility rebates, and your net price.",
    metaTitle: "EV Tax Credit Calculator — Credits & Rebates in 2026",
    metaDescription: "Free EV tax credit calculator. See which EV credits and rebates still apply in 2026 and your net price after incentives.",
    calcInputs: [
      currencyField("vehiclePrice", "Vehicle Price", { default: 42000, max: 1000000, step: 500 }),
      {
        key: "acquiredBeforeCutoff", label: "Acquired by September 30, 2025?", type: "dropdown", required: true, default: 0,
        options: [
          { label: "No — Acquired After (No Federal Credit)", value: 0 },
          { label: "Yes — Acquired by September 30, 2025", value: 1 },
        ],
      },
      currencyField("federalCreditAmount", "Federal Credit If Eligible ($7,500 New / $4,000 Used)", { default: 7500, max: 7500, step: 500 }),
      currencyField("taxOwed", "Your Federal Income Tax Owed", { default: 10000, max: 10000000, step: 500 }),
      currencyField("stateRebate", "State Rebate or Credit", { default: 2000, max: 50000, step: 250, required: false }),
      currencyField("utilityRebate", "Utility Rebate", { default: 500, max: 10000, step: 50, required: false }),
    ],
    calcResult: { label: "Total Incentives", format: "currency" },
    calcResults: [
      { key: "federalCreditValue", label: "Federal Credit Value", format: "currency" },
      { key: "stateAndUtilityRebates", label: "State & Utility Rebates", format: "currency" },
      { key: "totalIncentives", label: "Total Incentives", format: "currency", highlight: true },
      { key: "netPrice", label: "Net Price After Incentives", format: "currency" },
      { key: "incentiveShareOfPrice", label: "Incentives as % of Price", format: "percentage" },
    ],
    instructions:
      "The federal clean vehicle credit — up to $7,500 for new EVs and $4,000 for used ones — ended for vehicles " +
      "acquired after September 30, 2025. If you signed a binding contract and paid by that date, you may still claim it " +
      "when you file; it's non-refundable, so it's limited to the federal tax you owe (unless transferred to the dealer " +
      "at purchase).\n\n" +
      "Many states and utilities still offer EV rebates, tax credits or reduced charging rates — check your state energy office.",
    examples:
      "Example: buying a $42,000 EV in 2026, the federal credit no longer applies, but $2,500 of state and " +
      "utility rebates brings the net price to $39,500.",
    assumptions:
      "Income and price caps for the former federal credit aren't checked. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is there still a federal credit for leased EVs?",
        answer: "The commercial clean vehicle credit that lessors passed on as lease discounts also ended for vehicles acquired after September 30, 2025.",
      },
    ],
  },
  {
    slug: "chip-tuning-fuel-savings-calculator",
    title: "Performance Chip Tuning Cost vs Fuel Savings Calculator",
    description: "See whether an ECU tune or performance chip pays for itself in fuel savings, including the extra cost if it requires premium fuel.",
    metaTitle: "Chip Tuning Calculator — ECU Tune Cost vs Fuel Savings",
    metaDescription: "Free chip tuning calculator. Compare an ECU tune's cost with fuel savings, including premium fuel, and find the payback.",
    calcInputs: [
      currencyField("tuneCost", "Tune or Chip Cost", { default: 600, max: 10000, step: 25 }),
      numberField("mpgBefore", "MPG Before Tuning", { default: 25, min: 1, max: 100, step: 1 }),
      percentField("mpgGainPercent", "Expected MPG Gain", { default: 5, max: 30, step: 0.5 }),
      numberField("milesPerYear", "Miles per Year", { default: 12000, min: 0, max: 100000, step: 500 }),
      currencyField("gasPrice", "Gas Price per Gallon", { default: 3.4, max: 20, step: 0.05 }),
      currencyField("premiumExtraPerGallon", "Extra Cost If Premium Fuel Is Required", { default: 0, max: 5, step: 0.05, required: false }),
    ],
    calcResult: { label: "Yearly Fuel Savings", format: "currency" },
    calcResults: [
      { key: "mpgAfter", label: "MPG After Tuning", format: "number" },
      { key: "fuelCostBefore", label: "Yearly Fuel Before", format: "currency" },
      { key: "fuelCostAfter", label: "Yearly Fuel After", format: "currency" },
      { key: "yearlyFuelSavings", label: "Yearly Fuel Savings", format: "currency", highlight: true },
      { key: "paybackYears", label: "Years to Pay Back the Tune", format: "number" },
    ],
    instructions:
      "Economy tunes can improve fuel economy a few percent, especially on turbocharged engines, but performance tunes " +
      "often lower it and may require premium fuel — which can wipe out any savings. Real gains depend heavily on how " +
      "you drive.\n\n" +
      "Tuning can void parts of your powertrain warranty, may break emissions rules in some states, and should be " +
      "disclosed to your insurer. A negative savings figure means the tune costs more in fuel.",
    examples:
      "Example: a 5% gain from 25 MPG saves $77.71 a year on 12,000 miles, so a " +
      "$600 tune takes about 7.72 years to pay back.",
    assumptions:
      "Steady MPG gain; no change in driving style. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do fuel-saving chips work?",
        answer: "Cheap plug-in \"fuel saver\" chips generally don't; reputable ECU tunes can, modestly, on some engines.",
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
