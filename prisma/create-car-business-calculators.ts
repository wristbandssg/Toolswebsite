// One-time (but safe to re-run) batch setup script: creates the Vehicle Business Use & Income tools
// (8) of the Car & Vehicle Cost Calculators expansion, filed under Car & Vehicle
// Cost Calculators > Vehicle Business Use & Income Calculators (both categories are created on first run).
// See src/lib/calc-engine-car-business.ts for the math and
// src/lib/calc-engine-car-buying.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-car-business-calculators.ts
// or
//   npm run db:create-car-business-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Car & Vehicle Cost Calculators", slug: "car-vehicle-cost-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Vehicle Business Use & Income Calculators", slug: "vehicle-business-use-income-calculators" };

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
    slug: "mileage-reimbursement-calculator",
    title: "Mileage Reimbursement Calculator",
    description: "Calculate mileage reimbursement at the 2026 IRS business rates (72.5¢ for January–June, 76¢ for July–December) and compare it with your employer's rate and your actual driving cost.",
    metaTitle: "Mileage Reimbursement Calculator — 2026 IRS Rate",
    metaDescription: "Free mileage reimbursement calculator with the 2026 IRS rates of 72.5¢ and 76¢ a mile. Compare with your employer's rate.",
    calcInputs: [
      numberField("milesFirstHalf", "Business Miles January–June", { default: 4000, min: 0, max: 200000, step: 100 }),
      numberField("milesSecondHalf", "Business Miles July–December", { default: 4000, min: 0, max: 200000, step: 100 }),
      currencyField("rateFirstHalf", "IRS Rate January–June (per Mile)", { default: 0.725, max: 2, step: 0.005 }),
      currencyField("rateSecondHalf", "IRS Rate July–December (per Mile)", { default: 0.76, max: 2, step: 0.005 }),
      currencyField("employerRate", "Your Employer's Rate per Mile", { default: 0.6, max: 2, step: 0.01 }),
      currencyField("actualCostPerMile", "Your Actual Cost per Mile", { default: 0.45, max: 3, step: 0.01 }),
    ],
    calcResult: { label: "Value at the IRS Rate", format: "currency" },
    calcResults: [
      { key: "totalBusinessMiles", label: "Total Business Miles", format: "number" },
      { key: "irsRateValue", label: "Value at the IRS Rate", format: "currency", highlight: true },
      { key: "employerReimbursement", label: "Employer Reimbursement", format: "currency" },
      { key: "shortfallVsIrsRate", label: "Shortfall vs IRS Rate", format: "currency" },
      { key: "yourActualCost", label: "Your Actual Driving Cost", format: "currency" },
      { key: "gainOverActualCost", label: "Reimbursement Minus Actual Cost", format: "currency" },
    ],
    instructions:
      "The IRS business standard mileage rate for 2026 is 72.5 cents a mile for January–June and 76 cents for " +
      "July–December, after a rare mid-year increase for higher fuel costs. Employers can reimburse up to this rate " +
      "tax-free under an accountable plan; self-employed people can deduct business miles at it.\n\n" +
      "Employers don't have to use the IRS rate, and employees can't deduct unreimbursed mileage on their federal " +
      "return. Commuting to your regular workplace isn't business mileage.",
    examples:
      "Example: 8,000 business miles split across the year are worth $5,940 at the IRS rates. An employer paying " +
      "$0.60 a mile reimburses $4,800 — $1,140 less.",
    assumptions:
      "IRS rates as published for 2026; some states require employers to reimburse vehicle expenses. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is mileage reimbursement taxable?",
        answer: "Not if paid at or below the IRS rate under an accountable plan with mileage records; amounts above it are taxable wages.",
      },
    ],
  },
  {
    slug: "vehicle-business-use-percentage-calculator",
    title: "Vehicle Business-Use Percentage Calculator",
    description: "Work out the business-use percentage of a personal vehicle and compare the actual-expense and standard-mileage deductions for self-employed and small business owners.",
    metaTitle: "Vehicle Business Use Percentage Calculator — Car Deduction",
    metaDescription: "Free vehicle business-use calculator. Find your business-use percentage and compare actual-expense vs standard mileage deductions.",
    calcInputs: [
      numberField("totalMiles", "Total Miles Driven in the Year", { default: 15000, min: 0, max: 500000, step: 500 }),
      numberField("businessMiles", "Business Miles (Not Commuting)", { default: 6000, min: 0, max: 500000, step: 100 }),
      currencyField("totalExpenses", "Total Vehicle Expenses (Gas, Insurance, Repairs, Depreciation)", { default: 9000, max: 1000000, step: 100 }),
      currencyField("standardRate", "IRS Rate per Mile (72.5¢ Jan–Jun, 76¢ Jul–Dec 2026)", { default: 0.725, max: 2, step: 0.005 }),
      percentField("taxRatePercent", "Your Tax Rate (Income + Self-Employment)", { default: 30, max: 60, step: 1 }),
    ],
    calcResult: { label: "Business-Use Percentage", format: "percentage" },
    calcResults: [
      { key: "businessUsePercent", label: "Business-Use Percentage", format: "percentage", highlight: true },
      { key: "actualExpenseDeduction", label: "Actual-Expense Deduction", format: "currency" },
      { key: "standardMileageDeduction", label: "Standard Mileage Deduction", format: "currency" },
      { key: "largerDeduction", label: "Larger Deduction", format: "currency" },
      { key: "taxSavings", label: "Tax Savings", format: "currency" },
    ],
    instructions:
      "If you use one vehicle for business and personal driving, only the business share of its costs is deductible. " +
      "Business-use percentage = business miles ÷ total miles. Driving between home and your regular workplace is " +
      "commuting, not business.\n\n" +
      "You can deduct either the business share of actual expenses or business miles × the standard rate. Business " +
      "use over 50% is needed for Section 179 and bonus depreciation. Keep a mileage log.",
    examples:
      "Example: 6,000 business miles out of 15,000 is 40% business use. The standard mileage deduction " +
      "of $4,350 beats $3,600 of actual expenses, saving about $1,305 in tax.",
    assumptions:
      "One standard rate for all miles; use the half-year rates for exact figures. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I switch between the two methods?",
        answer: "If you use the standard rate in the car's first business year, you can switch later; starting with actual expenses (with accelerated depreciation) generally locks you in.",
      },
    ],
  },
  {
    slug: "vehicle-depreciation-tax-calculator",
    title: "Vehicle Depreciation Tax Calculator",
    description: "Estimate your first-year tax deduction for a business vehicle — passenger car limits, heavy SUV Section 179 cap and 100% bonus depreciation — and the tax it saves.",
    metaTitle: "Vehicle Depreciation Tax Calculator — Section 179 & Bonus",
    metaDescription: "Free business vehicle depreciation calculator. Estimate 2026 first-year deductions with Section 179, bonus and car limits.",
    calcInputs: [
      currencyField("vehicleCost", "Vehicle Cost", { default: 60000, max: 10000000, step: 500 }),
      {
        key: "vehicleClass", label: "Vehicle Class", type: "dropdown", required: true, default: 2,
        options: [
          { label: "Passenger Car / Light Truck (6,000 lb GVWR or Less)", value: 1 },
          { label: "Heavy SUV (6,001–14,000 lb GVWR)", value: 2 },
          { label: "Heavy Pickup (6-ft+ Bed) or Cargo Van", value: 3 },
        ],
      },
      percentField("businessUsePercent", "Business Use", { default: 80, max: 100, step: 5 }),
      {
        key: "useBonus", label: "Take Bonus Depreciation?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes (100% Bonus)", value: 1 },
          { label: "No", value: 0 },
        ],
      },
      percentField("taxRatePercent", "Your Tax Rate", { default: 30, max: 60, step: 1 }),
    ],
    calcResult: { label: "First-Year Deduction", format: "currency" },
    calcResults: [
      { key: "businessBasis", label: "Business Basis", format: "currency" },
      { key: "firstYearDeduction", label: "First-Year Deduction", format: "currency", highlight: true },
      { key: "firstYearTaxSavings", label: "First-Year Tax Savings", format: "currency" },
      { key: "remainingBasis", label: "Basis Left to Depreciate", format: "currency" },
      { key: "deductionAsShareOfCost", label: "Deduction as % of Cost", format: "percentage" },
    ],
    instructions:
      "Business vehicles are depreciated by business-use share. Passenger cars and light trucks (6,000 lb GVWR or less) " +
      "face \"luxury auto\" caps — $20,300 in the first year for 2026 with bonus depreciation, $12,300 without. Heavy SUVs " +
      "over 6,000 lb can expense up to $32,000 under Section 179, and 100% bonus depreciation (restored for property " +
      "acquired after January 19, 2025) can cover the rest. Heavy pickups and cargo vans aren't capped.\n\n" +
      "You need more than 50% business use for Section 179 and bonus depreciation; if business use later drops to 50% " +
      "or below, part of the deduction is recaptured as income.",
    examples:
      "Example: a $60,000 heavy SUV used 80% for business has a $48,000 business basis. With 100% bonus " +
      "depreciation, the first-year deduction is $48,000, saving about $14,400 in tax.",
    assumptions:
      "2026 limits; half-year convention; later-year amounts and state rules not shown. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Where do I find my vehicle's GVWR?",
        answer: "On the sticker inside the driver's door jamb — it's the gross vehicle weight rating, not the curb weight.",
      },
    ],
  },
  {
    slug: "fleet-vehicle-cost-calculator",
    title: "Company Fleet Vehicle Cost Calculator",
    description: "Calculate the yearly cost of running company fleet vehicles — depreciation, fuel, maintenance, insurance, registration and telematics — per vehicle, per mile and for the whole fleet.",
    metaTitle: "Fleet Vehicle Cost Calculator — Cost per Vehicle & Mile",
    metaDescription: "Free company fleet cost calculator. Find yearly cost per vehicle, cost per mile and total fleet operating cost.",
    calcInputs: [
      numberField("vehicles", "Number of Vehicles", { default: 10, min: 1, max: 100000, step: 1 }),
      currencyField("purchasePrice", "Purchase Price per Vehicle", { default: 40000, max: 1000000, step: 500 }),
      numberField("years", "Years in Service", { default: 5, min: 1, max: 20, step: 1 }),
      percentField("resalePercent", "Resale Value at the End", { default: 35, max: 100, step: 1 }),
      numberField("milesPerYear", "Miles per Vehicle per Year", { default: 25000, min: 0, max: 200000, step: 1000 }),
      numberField("mpg", "Fuel Economy (MPG)", { default: 22, min: 1, max: 100, step: 1 }),
      currencyField("fuelPrice", "Fuel Price per Gallon", { default: 3.5, max: 20, step: 0.05 }),
      currencyField("maintenancePerMile", "Maintenance & Tires per Mile", { default: 0.08, max: 2, step: 0.01 }),
      currencyField("insurance", "Insurance per Vehicle per Year", { default: 2500, max: 50000, step: 50 }),
      currencyField("registration", "Registration per Vehicle per Year", { default: 300, max: 10000, step: 10 }),
      currencyField("telematicsMonthly", "Telematics / GPS per Vehicle per Month", { default: 30, max: 500, step: 1, required: false }),
    ],
    calcResult: { label: "Fleet Yearly Cost", format: "currency" },
    calcResults: [
      { key: "depreciationPerVehicle", label: "Depreciation per Vehicle per Year", format: "currency" },
      { key: "fuelPerVehicle", label: "Fuel per Vehicle per Year", format: "currency" },
      { key: "costPerVehiclePerYear", label: "Cost per Vehicle per Year", format: "currency" },
      { key: "fleetYearlyCost", label: "Fleet Yearly Cost", format: "currency", highlight: true },
      { key: "costPerMile", label: "Cost per Mile", format: "currency" },
    ],
    instructions:
      "Fleet managers track total cost of ownership per vehicle: depreciation (purchase price less resale, spread over " +
      "its service life), fuel, maintenance, insurance, registration and telematics. Cost per mile lets you compare " +
      "vehicles and decide between owning, leasing or reimbursing employees for personal cars.\n\n" +
      "Financing costs and driver wages aren't included.",
    examples:
      "Example: 10 vehicles costing $40,000 each and driven 25,000 miles a year cost about $14,337.27 " +
      "each per year — $143,372.73 for the fleet, or $0.57 a mile.",
    assumptions:
      "Straight-line depreciation; constant fuel prices. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is it cheaper to reimburse employees instead of running a fleet?",
        answer: "For low-mileage drivers, reimbursing at or below the IRS rate is often cheaper; high-mileage roles usually favor company vehicles.",
      },
    ],
  },
  {
    slug: "fleet-replacement-cycle-calculator",
    title: "Fleet Vehicle Replacement Cycle Calculator",
    description: "Find the most cost-effective age to replace fleet vehicles by balancing falling depreciation against rising maintenance costs.",
    metaTitle: "Fleet Replacement Cycle Calculator — Best Replacement Age",
    metaDescription: "Free fleet replacement calculator. Find the vehicle age with the lowest average yearly cost of depreciation and maintenance.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 40000, max: 1000000, step: 500 }),
      percentField("depreciationPercent", "Value Lost per Year", { default: 18, max: 50, step: 1 }),
      currencyField("firstYearMaintenance", "First-Year Maintenance & Repairs", { default: 800, max: 50000, step: 50 }),
      percentField("maintenanceGrowthPercent", "Yearly Increase in Maintenance", { default: 25, max: 100, step: 1 }),
      numberField("plannedYears", "Your Planned Replacement Age (Years)", { default: 5, min: 1, max: 10, step: 1 }),
    ],
    calcResult: { label: "Best Replacement Year", format: "number" },
    calcResults: [
      { key: "bestReplacementYear", label: "Best Replacement Year", format: "number", highlight: true },
      { key: "lowestAverageYearlyCost", label: "Lowest Average Yearly Cost", format: "currency" },
      { key: "yourPlanAverageYearlyCost", label: "Average Yearly Cost at Your Plan", format: "currency" },
      { key: "extraCostPerYearOfYourPlan", label: "Extra Cost per Year of Your Plan", format: "currency" },
    ],
    instructions:
      "Replacing vehicles too early wastes money on depreciation; keeping them too long piles up repairs, downtime and " +
      "breakdowns. The cheapest point is the age where the average yearly cost of depreciation plus maintenance is " +
      "lowest.\n\n" +
      "High-mileage fleets usually reach it sooner. Add downtime costs to maintenance if breakdowns stop your business.",
    examples:
      "Example: a $40,000 vehicle losing 18% a year, with maintenance rising 25% a year, is " +
      "cheapest to replace at year 8 ($5,962.12 a year). Replacing at year 5 costs " +
      "$385.09 more per year.",
    assumptions:
      "Constant depreciation rate; checks ages 1–10 years. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a typical fleet replacement cycle?",
        answer: "Often 3–5 years or 75,000–120,000 miles for cars and light trucks, longer for low-mileage vehicles.",
      },
    ],
  },
  {
    slug: "fleet-fuel-card-savings-calculator",
    title: "Fleet Fuel Card Savings Calculator",
    description: "Estimate how much a fleet fuel card saves through per-gallon discounts, preventing fuel misuse and less admin time, after card fees.",
    metaTitle: "Fleet Fuel Card Savings Calculator — Discounts & Controls",
    metaDescription: "Free fleet fuel card calculator. Estimate per-gallon discounts, misuse prevention and admin savings net of card fees.",
    calcInputs: [
      numberField("vehicles", "Number of Vehicles", { default: 10, min: 1, max: 100000, step: 1 }),
      numberField("gallonsPerVehicle", "Gallons per Vehicle per Month", { default: 120, min: 0, max: 5000, step: 5 }),
      currencyField("fuelPrice", "Fuel Price per Gallon", { default: 3.5, max: 20, step: 0.05 }),
      currencyField("discountPerGallon", "Discount per Gallon", { default: 0.06, max: 1, step: 0.01 }),
      percentField("misusePreventedPercent", "Fuel Misuse Prevented (% of Spend)", { default: 2, max: 20, step: 0.5 }),
      numberField("adminHoursSaved", "Admin Hours Saved per Month", { default: 10, min: 0, max: 500, step: 1 }),
      currencyField("adminHourlyCost", "Admin Cost per Hour", { default: 30, max: 500, step: 1 }),
      currencyField("cardFeePerVehicle", "Card Fee per Vehicle per Month", { default: 2, max: 100, step: 0.5, required: false }),
    ],
    calcResult: { label: "Net Yearly Savings", format: "currency" },
    calcResults: [
      { key: "monthlyFuelSpend", label: "Monthly Fuel Spend", format: "currency" },
      { key: "discountSavings", label: "Discount Savings per Month", format: "currency" },
      { key: "misusePrevented", label: "Misuse Prevented per Month", format: "currency" },
      { key: "adminTimeSavings", label: "Admin Time Saved per Month", format: "currency" },
      { key: "cardFees", label: "Card Fees per Month", format: "currency" },
      { key: "netMonthlySavings", label: "Net Monthly Savings", format: "currency" },
      { key: "netYearlySavings", label: "Net Yearly Savings", format: "currency", highlight: true },
    ],
    instructions:
      "Fleet fuel cards give per-gallon discounts or rebates at partner stations, and let you limit purchases by driver, " +
      "fuel type, time and location — cutting misuse and fraud. Automatic reports replace receipt collection and " +
      "expense reports.\n\n" +
      "Compare network coverage on your routes, since discounts only apply at participating stations.",
    examples:
      "Example: 10 vehicles using 120 gallons a month save $72 in discounts, $84 in prevented " +
      "misuse and $300 of admin time — $5,232 a year after fees.",
    assumptions:
      "All fueling at in-network stations. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do fuel cards charge interest?",
        answer: "Most are charge cards paid in full each billing cycle; late payments can bring fees or interest.",
      },
    ],
  },
  {
    slug: "car-sharing-host-earnings-calculator",
    title: "Car Sharing Host Earnings Calculator",
    description: "Estimate what you can earn renting out your car on a peer-to-peer car sharing platform, after the platform's cut, cleaning, extra wear and taxes.",
    metaTitle: "Car Sharing Host Earnings Calculator — Peer-to-Peer Rental",
    metaDescription: "Free car sharing host calculator. Estimate monthly earnings from renting out your car after platform fees, wear and tax.",
    calcInputs: [
      currencyField("dailyRate", "Daily Rental Price", { default: 70, max: 2000, step: 5 }),
      numberField("bookedDaysPerMonth", "Booked Days per Month", { default: 15, min: 0, max: 31, step: 1 }),
      percentField("hostSharePercent", "Your Share After Platform Fee", { default: 75, max: 100, step: 1 }),
      numberField("tripsPerMonth", "Trips per Month", { default: 5, min: 0, max: 31, step: 1 }),
      currencyField("cleaningPerTrip", "Cleaning & Handover Cost per Trip", { default: 20, max: 500, step: 5 }),
      numberField("milesPerBookedDay", "Miles Driven per Booked Day", { default: 50, min: 0, max: 1000, step: 5 }),
      currencyField("wearPerMile", "Wear & Depreciation per Mile", { default: 0.1, max: 2, step: 0.01 }),
      percentField("taxRatePercent", "Tax Rate on Earnings", { default: 22, max: 60, step: 1 }),
    ],
    calcResult: { label: "Net Monthly Earnings (After Tax)", format: "currency" },
    calcResults: [
      { key: "grossBookings", label: "Gross Bookings", format: "currency" },
      { key: "hostEarnings", label: "Your Earnings After Platform Fee", format: "currency" },
      { key: "monthlyCosts", label: "Cleaning & Wear", format: "currency" },
      { key: "netMonthlyBeforeTax", label: "Net Monthly Before Tax", format: "currency" },
      { key: "netMonthlyAfterTax", label: "Net Monthly Earnings (After Tax)", format: "currency", highlight: true },
      { key: "netYearlyAfterTax", label: "Net Yearly Earnings", format: "currency" },
      { key: "netPerBookedDay", label: "Net per Booked Day", format: "currency" },
    ],
    instructions:
      "Peer-to-peer car sharing lets you rent your car to travelers and locals. The platform keeps a share of each " +
      "booking — typically 15–40%, depending on the protection plan you choose — and you cover cleaning, handovers and " +
      "the extra wear from guests' miles.\n\n" +
      "Your personal auto policy usually doesn't cover rentals; the platform's protection plan does, with a deductible. " +
      "Earnings are taxable income.",
    examples:
      "Example: 15 booked days at $70 bring $1,050; after the platform's cut, cleaning and wear you net " +
      "$477.75 a month after tax — $5,733 a year.",
    assumptions:
      "Platform protection plan used; financing and parking not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does renting out my car affect my loan?",
        answer: "Some loan and lease agreements prohibit commercial use or rentals — check your contract first.",
      },
    ],
  },
  {
    slug: "car-wrap-advertising-income-calculator",
    title: "Car Wrap Advertising Income Calculator",
    description: "Estimate what you can earn by letting a company wrap your car with ads, after any extra driving costs and taxes.",
    metaTitle: "Car Wrap Advertising Income Calculator — Get Paid to Drive",
    metaDescription: "Free car wrap advertising calculator. Estimate earnings from ad wraps on your car after extra driving costs and tax.",
    calcInputs: [
      currencyField("monthlyPayment", "Monthly Payment", { default: 150, max: 5000, step: 10 }),
      numberField("months", "Campaign Length (Months)", { default: 6, min: 1, max: 36, step: 1 }),
      numberField("extraMilesPerMonth", "Extra Miles You'd Drive per Month", { default: 0, min: 0, max: 10000, step: 50, required: false }),
      currencyField("costPerMile", "Driving Cost per Mile", { default: 0.3, max: 3, step: 0.01 }),
      percentField("taxRatePercent", "Tax Rate on the Income", { default: 22, max: 60, step: 1 }),
    ],
    calcResult: { label: "Net Income After Tax", format: "currency" },
    calcResults: [
      { key: "grossIncome", label: "Gross Income", format: "currency" },
      { key: "extraDrivingCost", label: "Extra Driving Cost", format: "currency" },
      { key: "netBeforeTax", label: "Net Before Tax", format: "currency" },
      { key: "netAfterTax", label: "Net Income After Tax", format: "currency", highlight: true },
      { key: "netPerMonth", label: "Net per Month", format: "currency" },
    ],
    instructions:
      "Car wrap advertising companies pay drivers — usually about $100–$500 a month — to drive with a full or partial ad " +
      "wrap, often requiring a minimum number of miles in certain areas. Legitimate companies install and remove the wrap " +
      "free.\n\n" +
      "Beware of scams: any offer that sends you a check and asks you to pay a \"wrap installer\" is a fraud. The income " +
      "is taxable.",
    examples:
      "Example: $150 a month for 6 months is $900, or $702 after tax — about $117 a month.",
    assumptions:
      "Wrap installation and removal paid by the advertiser. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does an ad wrap damage paint?",
        answer: "Professionally installed and removed vinyl generally doesn't harm factory paint, but can lift poor-quality or repainted finishes.",
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
