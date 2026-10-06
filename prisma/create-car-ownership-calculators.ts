// One-time (but safe to re-run) batch setup script: creates the Ownership Cost tools
// (11) of the Car & Vehicle Cost Calculators expansion, filed under Car & Vehicle
// Cost Calculators > Car Ownership, Fuel & EV Cost Calculators (both categories are created on first run).
// See src/lib/calc-engine-car-ownership.ts for the math and
// src/lib/calc-engine-car-buying.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-car-ownership-calculators.ts
// or
//   npm run db:create-car-ownership-calculators

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
    slug: "car-total-cost-of-ownership-calculator",
    title: "Car Total Cost of Ownership Calculator",
    description: "Calculate the true cost of owning a car — compact, sedan, SUV, truck, minivan, hybrid, luxury or sports car — including depreciation, fuel, insurance, maintenance, interest and taxes.",
    metaTitle: "Car Total Cost of Ownership Calculator — True Cost to Own",
    metaDescription: "Free car cost of ownership calculator. Add depreciation, fuel, insurance, maintenance and interest by vehicle type.",
    calcInputs: [
      {
        key: "vehicleType", label: "Vehicle Type", type: "dropdown", required: true, default: 2,
        options: [
          { label: "Compact Car", value: 1 },
          { label: "Midsize Sedan", value: 2 },
          { label: "SUV", value: 3 },
          { label: "Pickup Truck", value: 4 },
          { label: "Minivan", value: 5 },
          { label: "Hybrid", value: 6 },
          { label: "Luxury Car", value: 7 },
          { label: "Sports Car", value: 8 },
        ],
      },
      currencyField("price", "Purchase Price", { default: 35000, max: 1000000, step: 500 }),
      numberField("years", "Years of Ownership", { default: 5, min: 1, max: 20, step: 1 }),
      numberField("milesPerYear", "Miles per Year", { default: 12000, min: 0, max: 100000, step: 500 }),
      numberField("mpg", "Fuel Economy (MPG)", { default: 30, min: 1, max: 150, step: 1 }),
      currencyField("gasPrice", "Gas Price per Gallon", { default: 3.4, max: 20, step: 0.05 }),
      currencyField("insurance", "Insurance per Year", { default: 1800, max: 50000, step: 50 }),
      currencyField("registration", "Registration per Year", { default: 200, max: 10000, step: 10 }),
      currencyField("maintenance", "Maintenance & Repairs per Year", { default: 900, max: 50000, step: 50 }),
      currencyField("parking", "Parking per Year", { default: 0, max: 50000, step: 50, required: false }),
      currencyField("downPayment", "Down Payment", { default: 5000, max: 1000000, step: 500 }),
      percentField("loanRatePercent", "Loan Rate (APR)", { default: 7, max: 30, step: 0.1 }),
      numberField("loanTermMonths", "Loan Term (Months)", { default: 60, min: 12, max: 96, step: 12 }),
      percentField("salesTaxPercent", "Sales Tax Rate", { default: 7, max: 15, step: 0.1 }),
    ],
    calcResult: { label: "Total Cost of Ownership", format: "currency" },
    calcResults: [
      { key: "depreciation", label: "Depreciation", format: "currency" },
      { key: "fuel", label: "Fuel", format: "currency" },
      { key: "insuranceTotal", label: "Insurance", format: "currency" },
      { key: "maintenanceTotal", label: "Maintenance & Repairs", format: "currency" },
      { key: "loanInterest", label: "Loan Interest", format: "currency" },
      { key: "taxesAndFees", label: "Sales Tax & Registration", format: "currency" },
      { key: "totalCost", label: "Total Cost of Ownership", format: "currency", highlight: true },
      { key: "costPerYear", label: "Cost per Year", format: "currency" },
      { key: "costPerMonth", label: "Cost per Month", format: "currency" },
      { key: "costPerMile", label: "Cost per Mile", format: "currency" },
    ],
    instructions:
      "The sticker price is only part of what a car costs. Depreciation is usually the biggest expense, followed by fuel, " +
      "insurance, financing and maintenance. Vehicle type matters: pickup trucks and many SUVs hold their value best, " +
      "while luxury cars and minivans lose value fastest.\n\n" +
      "For a student or first car, use your actual insurance quote (often much higher for young drivers) and lower " +
      "yearly miles.",
    examples:
      "Example: a $35,000 midsize sedan driven 12,000 miles a year costs about $47,942.16 over 5 years — " +
      "$799.04 a month or $0.80 a mile. Depreciation alone is $18,550.",
    assumptions:
      "Typical 5-year value retention by vehicle type; loan principal is not a cost. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which cars are cheapest to own?",
        answer: "Reliable compact cars and hybrids from brands with strong resale value usually have the lowest cost per mile.",
      },
    ],
  },
  {
    slug: "car-depreciation-calculator",
    title: "Car Depreciation Calculator",
    description: "Estimate how much value a car loses each year by brand category — mainstream, high-resale brands, luxury, trucks and SUVs, EVs — or how a classic car appreciates.",
    metaTitle: "Car Depreciation Calculator — Value by Year & Brand Type",
    metaDescription: "Free car depreciation calculator. Estimate your car's value after any number of years by brand category, or a classic car's value.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price or Current Value", { default: 35000, max: 10000000, step: 500 }),
      numberField("years", "Years", { default: 5, min: 0, max: 30, step: 1 }),
      {
        key: "category", label: "Brand / Vehicle Category", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Mainstream Brands", value: 1 },
          { label: "High-Resale Brands (e.g., Toyota, Honda, Subaru, Porsche)", value: 2 },
          { label: "Luxury Brands", value: 3 },
          { label: "Pickup Trucks & SUVs", value: 4 },
          { label: "Electric Vehicles", value: 5 },
          { label: "Classic / Collector Car (Appreciating)", value: 6 },
        ],
      },
      percentField("customRatePercent", "Your Own Yearly Rate (0 = Typical for Category)", { default: 0, max: 60, step: 1, required: false }),
    ],
    calcResult: { label: "Value After the Years", format: "currency" },
    calcResults: [
      { key: "valueAfterYears", label: "Value After the Years", format: "currency", highlight: true },
      { key: "totalDepreciation", label: "Total Depreciation", format: "currency" },
      { key: "depreciationPercent", label: "Value Lost", format: "percentage" },
      { key: "firstYearLoss", label: "First-Year Loss", format: "currency" },
      { key: "averagePerYear", label: "Average Loss per Year", format: "currency" },
    ],
    instructions:
      "New cars typically lose about 20% of their value in the first year and around 15% a year after that, so a car is " +
      "often worth about 40% of its price after five years. Brands known for reliability hold value better; luxury cars " +
      "and many EVs drop faster.\n\n" +
      "Classic and collector cars in good condition can gain value instead — a negative depreciation figure means the " +
      "car appreciated. Mileage, condition and accident history all shift actual values.",
    examples:
      "Example: a $35,000 car from a mainstream brand is worth about $14,616.18 after 5 years, losing " +
      "$20,383.83 (58.24%) — $7,000 in the first year alone.",
    assumptions:
      "Typical rates: mainstream 20%/15%, high-resale 12%/10%, luxury 25%/18%, trucks & SUVs 15%/12%, EVs 25%/15% (first year/after); classics +4% a year. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does buying a 2–3 year old car avoid depreciation?",
        answer: "It avoids the steepest drop — the first owner absorbs it — while the car usually still has years of reliable life left.",
      },
    ],
  },
  {
    slug: "motorcycle-total-cost-of-ownership-calculator",
    title: "Motorcycle Total Cost of Ownership Calculator",
    description: "Calculate the full cost of owning a motorcycle — depreciation, fuel, insurance, registration, maintenance and riding gear — per year, month and mile.",
    metaTitle: "Motorcycle Cost of Ownership Calculator — Yearly Cost",
    metaDescription: "Free motorcycle cost of ownership calculator. Add depreciation, fuel, insurance, upkeep and gear to find your cost per mile.",
    calcInputs: [
      currencyField("price", "Motorcycle Price", { default: 12000, max: 1000000, step: 250 }),
      numberField("years", "Years of Ownership", { default: 5, min: 1, max: 20, step: 1 }),
      percentField("depreciationPercent", "Depreciation per Year", { default: 12, max: 50, step: 1 }),
      numberField("milesPerYear", "Miles per Year", { default: 4000, min: 0, max: 100000, step: 250 }),
      numberField("mpg", "Fuel Economy (MPG)", { default: 45, min: 1, max: 200, step: 1 }),
      currencyField("gasPrice", "Gas Price per Gallon", { default: 3.4, max: 20, step: 0.05 }),
      currencyField("insurance", "Insurance per Year", { default: 600, max: 20000, step: 25 }),
      currencyField("registration", "Registration per Year", { default: 100, max: 5000, step: 10 }),
      currencyField("maintenance", "Maintenance & Tires per Year", { default: 500, max: 20000, step: 25 }),
      currencyField("gear", "Riding Gear (Helmet, Jacket, Gloves)", { default: 800, max: 20000, step: 50 }),
    ],
    calcResult: { label: "Total Cost of Ownership", format: "currency" },
    calcResults: [
      { key: "depreciation", label: "Depreciation", format: "currency" },
      { key: "fuelPerYear", label: "Fuel per Year", format: "currency" },
      { key: "totalCost", label: "Total Cost of Ownership", format: "currency", highlight: true },
      { key: "costPerYear", label: "Cost per Year", format: "currency" },
      { key: "costPerMonth", label: "Cost per Month", format: "currency" },
      { key: "costPerMile", label: "Cost per Mile", format: "currency" },
    ],
    instructions:
      "Motorcycles use far less fuel than cars, but tires and chains wear faster, insurance varies a lot with engine size " +
      "and rider age, and you'll need proper riding gear. Many riders store their bike in winter — enter the miles you " +
      "actually ride.",
    examples:
      "Example: a $12,000 motorcycle ridden 4,000 miles a year costs about $13,978.33 over 5 years — " +
      "$232.97 a month or $0.70 a mile.",
    assumptions:
      "Gear bought once; loan interest not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a motorcycle cheaper than a car?",
        answer: "Usually cheaper to buy and fuel, but cost per mile can be similar for low-mileage riders because fixed costs are spread over fewer miles.",
      },
    ],
  },
  {
    slug: "boat-total-cost-of-ownership-calculator",
    title: "Boat Total Cost of Ownership Calculator",
    description: "Calculate the real cost of owning a boat: depreciation, fuel by engine hours, insurance, slip or storage and maintenance — and the cost per hour on the water.",
    metaTitle: "Boat Cost of Ownership Calculator — Cost per Hour",
    metaDescription: "Free boat cost of ownership calculator. Add depreciation, fuel, slip, insurance and maintenance to find your cost per hour.",
    calcInputs: [
      currencyField("price", "Boat Price", { default: 40000, max: 10000000, step: 500 }),
      numberField("years", "Years of Ownership", { default: 5, min: 1, max: 30, step: 1 }),
      percentField("depreciationPercent", "Depreciation per Year", { default: 8, max: 50, step: 1 }),
      numberField("hoursPerYear", "Engine Hours per Year", { default: 75, min: 0, max: 2000, step: 5 }),
      numberField("gallonsPerHour", "Fuel Use (Gallons per Hour)", { default: 8, min: 0, max: 200, step: 0.5 }),
      currencyField("fuelPrice", "Marine Fuel Price per Gallon", { default: 4.5, max: 20, step: 0.05 }),
      currencyField("insurance", "Insurance per Year", { default: 800, max: 100000, step: 50 }),
      currencyField("slipOrStorage", "Slip, Mooring or Storage per Year", { default: 3000, max: 200000, step: 100 }),
      currencyField("maintenance", "Maintenance & Winterizing per Year", { default: 2000, max: 200000, step: 100 }),
      currencyField("registration", "Registration per Year", { default: 100, max: 10000, step: 10 }),
    ],
    calcResult: { label: "Total Cost of Ownership", format: "currency" },
    calcResults: [
      { key: "depreciation", label: "Depreciation", format: "currency" },
      { key: "fuelPerYear", label: "Fuel per Year", format: "currency" },
      { key: "totalCost", label: "Total Cost of Ownership", format: "currency", highlight: true },
      { key: "costPerYear", label: "Cost per Year", format: "currency" },
      { key: "costPerMonth", label: "Cost per Month", format: "currency" },
      { key: "costPerHourUsed", label: "Cost per Hour on the Water", format: "currency" },
    ],
    instructions:
      "A common rule of thumb is that keeping a boat costs about 10% of its value a year before fuel and depreciation. " +
      "Slip or storage fees, winterizing, bottom paint, engine service and insurance add up, and fuel use is measured " +
      "in gallons per hour.\n\n" +
      "Dividing by the hours you actually use the boat shows whether renting or a boat club might be cheaper.",
    examples:
      "Example: a $40,000 boat used 75 hours a year costs about $11,327.35 a year — $151.03 per hour on the water.",
    assumptions:
      "Loan interest and trailer/tow vehicle costs not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a boat club cheaper than owning?",
        answer: "For people who boat fewer than about 20–30 days a year, clubs or rentals often cost less than owning.",
      },
    ],
  },
  {
    slug: "rv-total-cost-of-ownership-calculator",
    title: "RV Total Cost of Ownership Calculator",
    description: "Calculate the cost of owning an RV or camper — depreciation, fuel, insurance, storage, maintenance and campsites — and the cost per night used.",
    metaTitle: "RV Cost of Ownership Calculator — Cost per Night",
    metaDescription: "Free RV cost of ownership calculator. Add depreciation, fuel, storage, insurance and campsites to find your cost per night.",
    calcInputs: [
      currencyField("price", "RV Price", { default: 80000, max: 10000000, step: 1000 }),
      numberField("years", "Years of Ownership", { default: 5, min: 1, max: 30, step: 1 }),
      percentField("depreciationPercent", "Depreciation per Year", { default: 10, max: 50, step: 1 }),
      numberField("milesPerYear", "Miles per Year", { default: 5000, min: 0, max: 100000, step: 250 }),
      numberField("mpg", "Fuel Economy (MPG)", { default: 10, min: 1, max: 50, step: 1 }),
      currencyField("gasPrice", "Fuel Price per Gallon", { default: 3.6, max: 20, step: 0.05 }),
      currencyField("insurance", "Insurance per Year", { default: 1500, max: 50000, step: 50 }),
      currencyField("registration", "Registration per Year", { default: 400, max: 10000, step: 25 }),
      currencyField("storage", "Storage per Year", { default: 1200, max: 50000, step: 50 }),
      currencyField("maintenance", "Maintenance per Year", { default: 1500, max: 50000, step: 50 }),
      numberField("nightsPerYear", "Nights Used per Year", { default: 30, min: 0, max: 365, step: 1 }),
      currencyField("campsitePerNight", "Campsite Fee per Night", { default: 50, max: 1000, step: 5 }),
    ],
    calcResult: { label: "Total Cost of Ownership", format: "currency" },
    calcResults: [
      { key: "depreciation", label: "Depreciation", format: "currency" },
      { key: "fuelPerYear", label: "Fuel per Year", format: "currency" },
      { key: "campsitesPerYear", label: "Campsites per Year", format: "currency" },
      { key: "totalCost", label: "Total Cost of Ownership", format: "currency", highlight: true },
      { key: "costPerYear", label: "Cost per Year", format: "currency" },
      { key: "costPerNight", label: "Cost per Night Used", format: "currency" },
    ],
    instructions:
      "RVs depreciate quickly — often 20% or more in the first year — and cost money to insure, store and maintain even " +
      "when parked. Motorhomes get roughly 6–12 miles per gallon. Dividing the total by the nights you use it shows the " +
      "real cost compared with renting an RV or staying in hotels.",
    examples:
      "Example: an $80,000 RV used 30 nights a year costs about $14,452.16 a year — $481.74 per night.",
    assumptions:
      "Loan interest not included; towable RVs add tow-vehicle costs. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is renting an RV cheaper than owning?",
        answer: "If you use one only a few weeks a year, renting is often cheaper; owning makes more sense for long or frequent trips.",
      },
    ],
  },
  {
    slug: "atv-total-cost-of-ownership-calculator",
    title: "ATV Total Cost of Ownership Calculator",
    description: "Calculate the cost of owning an ATV or UTV — depreciation, fuel by riding hours, insurance, registration, maintenance and gear — per year and per hour.",
    metaTitle: "ATV Cost of Ownership Calculator — Cost per Hour",
    metaDescription: "Free ATV cost of ownership calculator. Add depreciation, fuel, insurance, upkeep and gear to find your cost per riding hour.",
    calcInputs: [
      currencyField("price", "ATV / UTV Price", { default: 9000, max: 1000000, step: 250 }),
      numberField("years", "Years of Ownership", { default: 5, min: 1, max: 20, step: 1 }),
      percentField("depreciationPercent", "Depreciation per Year", { default: 12, max: 50, step: 1 }),
      numberField("hoursPerYear", "Riding Hours per Year", { default: 100, min: 0, max: 2000, step: 5 }),
      numberField("gallonsPerHour", "Fuel Use (Gallons per Hour)", { default: 1, min: 0, max: 20, step: 0.1 }),
      currencyField("gasPrice", "Gas Price per Gallon", { default: 3.4, max: 20, step: 0.05 }),
      currencyField("insurance", "Insurance per Year", { default: 250, max: 10000, step: 25 }),
      currencyField("registration", "Registration / Trail Permit per Year", { default: 50, max: 5000, step: 5 }),
      currencyField("maintenance", "Maintenance & Tires per Year", { default: 400, max: 20000, step: 25 }),
      currencyField("gear", "Gear (Helmet, Goggles, Trailer Share)", { default: 500, max: 20000, step: 50 }),
    ],
    calcResult: { label: "Total Cost of Ownership", format: "currency" },
    calcResults: [
      { key: "depreciation", label: "Depreciation", format: "currency" },
      { key: "fuelPerYear", label: "Fuel per Year", format: "currency" },
      { key: "totalCost", label: "Total Cost of Ownership", format: "currency", highlight: true },
      { key: "costPerYear", label: "Cost per Year", format: "currency" },
      { key: "costPerMonth", label: "Cost per Month", format: "currency" },
      { key: "costPerHourUsed", label: "Cost per Riding Hour", format: "currency" },
    ],
    instructions:
      "ATVs and side-by-sides are cheap to fuel, but off-road riding wears tires, belts and suspension quickly. Many " +
      "states require registration or trail permits, and homeowners policies rarely cover off-property riding, so " +
      "separate ATV insurance is common.",
    examples:
      "Example: a $9,000 ATV ridden 100 hours a year costs about $9,950.41 over 5 years — $19.90 per riding hour.",
    assumptions:
      "Loan interest and trailer costs not included unless entered as gear. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I need insurance for an ATV?",
        answer: "Many states require it for public land or trails, and lenders require it if financed. It's wise even when optional.",
      },
    ],
  },
  {
    slug: "first-car-startup-cost-calculator",
    title: "First Car Startup Cost Calculator",
    description: "Find out how much cash you need to buy your first car — down payment, sales tax, registration, first insurance premium and an emergency fund — and what it'll cost each month.",
    metaTitle: "First Car Cost Calculator — Cash Needed & Monthly Cost",
    metaDescription: "Free first car cost calculator. Find the upfront cash and monthly cost of a first car, including tax, insurance and fees.",
    calcInputs: [
      currencyField("carPrice", "Car Price", { default: 12000, max: 1000000, step: 250 }),
      percentField("downPaymentPercent", "Down Payment", { default: 20, max: 100, step: 5 }),
      percentField("salesTaxPercent", "Sales Tax Rate", { default: 7, max: 15, step: 0.1 }),
      currencyField("registrationTitle", "Registration & Title Fees", { default: 300, max: 5000, step: 10 }),
      currencyField("insuranceSixMonths", "First 6-Month Insurance Premium", { default: 1200, max: 20000, step: 50 }),
      currencyField("inspection", "Pre-Purchase Inspection", { default: 50, max: 1000, step: 5, required: false }),
      currencyField("emergencyFund", "Car Emergency Fund", { default: 1000, max: 20000, step: 100, required: false }),
      currencyField("accessories", "Accessories (Mats, Phone Mount, Kit)", { default: 150, max: 5000, step: 10, required: false }),
      percentField("loanRatePercent", "Loan Rate (APR)", { default: 9, max: 30, step: 0.1 }),
      numberField("loanTermMonths", "Loan Term (Months)", { default: 48, min: 12, max: 84, step: 12 }),
      currencyField("gasMonthly", "Gas per Month", { default: 120, max: 5000, step: 10 }),
      currencyField("maintenanceMonthly", "Maintenance per Month", { default: 50, max: 5000, step: 5 }),
    ],
    calcResult: { label: "Cash Needed Up Front", format: "currency" },
    calcResults: [
      { key: "downPayment", label: "Down Payment", format: "currency" },
      { key: "salesTax", label: "Sales Tax", format: "currency" },
      { key: "upfrontCashNeeded", label: "Cash Needed Up Front", format: "currency", highlight: true },
      { key: "loanAmount", label: "Loan Amount", format: "currency" },
      { key: "monthlyPayment", label: "Monthly Loan Payment", format: "currency" },
      { key: "monthlyCostAfterPurchase", label: "Monthly Cost After Purchase", format: "currency" },
    ],
    instructions:
      "Buying your first car takes more cash than the down payment: sales tax, title and registration, the first " +
      "insurance premium (often paid six months at a time, and higher for new drivers), a pre-purchase inspection on a " +
      "used car, and a cushion for surprise repairs.\n\n" +
      "Get an insurance quote before you choose a car — it can change which car you can afford.",
    examples:
      "Example: a $12,000 first car with 20% down needs about $5,940 in cash up front. After " +
      "that, expect around $608.90 a month including a $238.90 loan payment.",
    assumptions:
      "Sales tax paid in cash; dealer fees not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can new drivers lower insurance?",
        answer: "Stay on a parent's policy if possible, choose a safe, modest car, and ask about good-student and driver-training discounts.",
      },
    ],
  },
  {
    slug: "rural-vs-urban-car-ownership-calculator",
    title: "Rural vs Urban Car Ownership Calculator",
    description: "Compare the yearly cost of owning a car in the country and in the city: more miles and fuel in rural areas versus higher insurance and parking in urban ones.",
    metaTitle: "Rural vs Urban Car Ownership Cost Calculator",
    metaDescription: "Free calculator comparing car ownership costs in rural and urban areas — miles, fuel, insurance and parking.",
    calcInputs: [
      currencyField("fixedCosts", "Fixed Costs per Year (Depreciation, Registration)", { default: 4000, max: 100000, step: 100 }),
      currencyField("maintenancePerMile", "Maintenance & Tires per Mile", { default: 0.1, max: 2, step: 0.01 }),
      numberField("ruralMiles", "Rural Miles per Year", { default: 18000, min: 0, max: 100000, step: 500 }),
      currencyField("ruralFuelPerMile", "Rural Fuel Cost per Mile", { default: 0.12, max: 2, step: 0.01 }),
      currencyField("ruralInsurance", "Rural Insurance per Year", { default: 1400, max: 20000, step: 50 }),
      numberField("urbanMiles", "Urban Miles per Year", { default: 8000, min: 0, max: 100000, step: 500 }),
      currencyField("urbanFuelPerMile", "Urban Fuel Cost per Mile", { default: 0.15, max: 2, step: 0.01 }),
      currencyField("urbanInsurance", "Urban Insurance per Year", { default: 2200, max: 20000, step: 50 }),
      currencyField("urbanParking", "Urban Parking per Year", { default: 2400, max: 100000, step: 100 }),
    ],
    calcResult: { label: "Urban Minus Rural Cost", format: "currency" },
    calcResults: [
      { key: "ruralYearlyCost", label: "Rural Yearly Cost", format: "currency" },
      { key: "urbanYearlyCost", label: "Urban Yearly Cost", format: "currency" },
      { key: "urbanMinusRural", label: "Urban Minus Rural Cost", format: "currency", highlight: true },
      { key: "ruralCostPerMile", label: "Rural Cost per Mile", format: "currency" },
      { key: "urbanCostPerMile", label: "Urban Cost per Mile", format: "currency" },
    ],
    instructions:
      "Rural drivers usually cover far more miles, so fuel and wear dominate, but insurance tends to be cheaper and " +
      "parking free. City drivers drive less, yet pay more for insurance (more theft and accidents) and often a lot for " +
      "parking — and stop-and-go traffic lowers fuel economy.\n\n" +
      "A negative result means owning in the country costs more.",
    examples:
      "Example: driving 18,000 miles a year in the country costs about $9,360, while 8,000 miles in the " +
      "city costs $10,600 with parking — $1,240 more, or $1.33 vs $0.52 a mile.",
    assumptions:
      "Same car in both places. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is car insurance higher in cities?",
        answer: "Denser traffic, more accidents, theft and vandalism, and higher repair costs raise claims in urban ZIP codes.",
      },
    ],
  },
  {
    slug: "monthly-parking-cost-calculator",
    title: "Monthly Parking Cost Calculator",
    description: "Compare a monthly parking permit with paying daily or by the hour, and find how many days a month make the monthly pass worth it.",
    metaTitle: "Monthly Parking Cost Calculator — Permit vs Daily",
    metaDescription: "Free monthly parking calculator. Compare a monthly permit with daily and hourly parking and find the break-even days.",
    calcInputs: [
      currencyField("monthlyPermit", "Monthly Permit Price", { default: 200, max: 10000, step: 5 }),
      currencyField("dailyRate", "Daily Rate (Daily Max)", { default: 15, max: 500, step: 1 }),
      currencyField("hourlyRate", "Hourly Rate", { default: 3, max: 100, step: 0.25 }),
      numberField("hoursPerDay", "Hours Parked per Day", { default: 9, min: 0, max: 24, step: 0.5 }),
      numberField("daysPerMonth", "Days Parked per Month", { default: 20, min: 0, max: 31, step: 1 }),
    ],
    calcResult: { label: "Cheapest Monthly Cost", format: "currency" },
    calcResults: [
      { key: "monthlyPermitCost", label: "Monthly Permit", format: "currency" },
      { key: "payingDailyCost", label: "Paying Daily", format: "currency" },
      { key: "payingHourlyCost", label: "Paying Hourly", format: "currency" },
      { key: "cheapestMonthlyCost", label: "Cheapest Monthly Cost", format: "currency", highlight: true },
      { key: "yearlyCost", label: "Yearly Cost (Cheapest Option)", format: "currency" },
      { key: "breakEvenDaysForPermit", label: "Days per Month When a Permit Pays Off", format: "number" },
    ],
    instructions:
      "If you park most workdays, a monthly permit is usually cheapest; with hybrid work, paying daily can win. Hourly " +
      "parking is capped at the daily maximum here.\n\n" +
      "Ask your employer about pre-tax parking benefits, which can reduce the cost by your tax rate.",
    examples:
      "Example: parking 20 days a month costs $300 at the daily rate versus a $200 permit. The permit " +
      "pays off if you park more than about 13.33 days a month.",
    assumptions:
      "Same rates every day. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is parking a tax-free benefit?",
        answer: "In the US, employers can provide qualified parking up to a monthly limit tax-free, or let you pay for it pre-tax.",
      },
    ],
  },
  {
    slug: "toll-cost-calculator",
    title: "Toll Cost Calculator",
    description: "Estimate your monthly and yearly toll costs and how much a toll transponder (such as E-ZPass, SunPass or FasTrak) saves compared with pay-by-plate rates.",
    metaTitle: "Toll Cost Calculator — Transponder Savings",
    metaDescription: "Free toll cost calculator. Estimate monthly and yearly tolls and the savings from a toll transponder vs pay-by-mail.",
    calcInputs: [
      currencyField("tollPerTrip", "Toll per Trip (Pay-by-Plate Rate)", { default: 6.5, max: 500, step: 0.25 }),
      numberField("tripsPerMonth", "Toll Trips per Month", { default: 40, min: 0, max: 1000, step: 1 }),
      percentField("transponderDiscountPercent", "Transponder Discount", { default: 30, max: 80, step: 1 }),
      currencyField("transponderMonthlyFee", "Transponder Monthly Fee", { default: 0, max: 100, step: 0.5, required: false }),
    ],
    calcResult: { label: "Yearly Savings with a Transponder", format: "currency" },
    calcResults: [
      { key: "monthlyTollsWithoutTransponder", label: "Monthly Tolls (Pay-by-Plate)", format: "currency" },
      { key: "monthlyTollsWithTransponder", label: "Monthly Tolls (Transponder)", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency" },
      { key: "yearlyTolls", label: "Yearly Tolls (Transponder)", format: "currency" },
      { key: "yearlySavings", label: "Yearly Savings with a Transponder", format: "currency", highlight: true },
    ],
    instructions:
      "Toll roads charge less to drivers with an electronic transponder than to those billed by license plate, often " +
      "20–50% less, and pay-by-mail bills can add admin fees. Some agencies charge a small monthly transponder fee.\n\n" +
      "Commuters can also check for frequent-user or off-peak discounts.",
    examples:
      "Example: 40 toll trips a month at $6.50 cost $260 by plate, or " +
      "$182 with a transponder — $936 saved a year.",
    assumptions:
      "One flat toll per trip; pay-by-mail admin fees not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I use my transponder in other states?",
        answer: "Many systems are interoperable (E-ZPass works across much of the eastern US), but check coverage before a road trip.",
      },
    ],
  },
  {
    slug: "car-storage-cost-calculator",
    title: "Car Storage Cost Calculator",
    description: "Estimate the cost of storing a car for months — storage fees and prep, minus insurance savings — and compare it with selling the car and buying another later.",
    metaTitle: "Car Storage Cost Calculator — Store vs Sell",
    metaDescription: "Free car storage cost calculator. Add storage fees and prep, subtract insurance savings, and compare with selling and rebuying.",
    calcInputs: [
      currencyField("monthlyStorageFee", "Storage Fee per Month", { default: 150, max: 10000, step: 5 }),
      numberField("months", "Months in Storage", { default: 6, min: 0, max: 120, step: 1 }),
      currencyField("prepCost", "Prep (Battery Tender, Fuel Stabilizer, Cover)", { default: 100, max: 5000, step: 10 }),
      currencyField("insuranceSavingsMonthly", "Insurance Savings per Month (Storage Coverage)", { default: 60, max: 5000, step: 5, required: false }),
      currencyField("carValue", "Car Value", { default: 20000, max: 10000000, step: 500 }),
      percentField("sellRebuyPercent", "Cost of Selling & Rebuying (% of Value)", { default: 8, max: 30, step: 1 }),
    ],
    calcResult: { label: "Net Storage Cost", format: "currency" },
    calcResults: [
      { key: "storageFees", label: "Storage Fees", format: "currency" },
      { key: "insuranceSavings", label: "Insurance Savings", format: "currency" },
      { key: "netStorageCost", label: "Net Storage Cost", format: "currency", highlight: true },
      { key: "netCostPerMonth", label: "Net Cost per Month", format: "currency" },
      { key: "sellAndBuyBackCost", label: "Cost of Selling & Buying Another", format: "currency" },
    ],
    instructions:
      "When you're away for months — deployment, travel, a seasonal car — you can store the car and switch to a " +
      "storage (comprehensive-only) policy to cut insurance. Prepare it with a full tank and fuel stabilizer, a battery " +
      "tender, inflated tires and a breathable cover.\n\n" +
      "For long absences, compare storage with selling now and buying later, which costs the dealer's margin and fees.",
    examples:
      "Example: storing a car for 6 months at $150 a month costs $640 after $360 of " +
      "insurance savings, versus about $1,600 to sell it and buy another later.",
    assumptions:
      "Registration and loan payments continue either way. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I cancel insurance on a stored car?",
        answer: "Keep at least comprehensive coverage for theft, fire and weather; lenders require it on financed cars, and a gap in coverage can raise future rates.",
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
