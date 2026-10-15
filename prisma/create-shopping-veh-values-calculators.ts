// One-time (but safe to re-run) batch setup script: creates 15 vehicle and equipment value tools
// from the user's shopping list (Shopping Calculators > Vehicle, Resale & Collectibles Calculators).
// See src/lib/calc-engine-shopping-veh-values.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-veh-values-calculators.ts
// or
//   npm run db:create-shopping-veh-values-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Vehicle, Resale & Collectibles Calculators", slug: "vehicle-resale-collectibles-calculators" };

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

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
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

const CONDITION = () => dropdown("condition", "Condition", [["Excellent", 1.1], ["Good", 1], ["Fair", 0.85], ["Poor", 0.65]], 1);

const TOOLS: ToolDef[] = [
  {
    slug: "car-value-calculator",
    title: "Car Value Calculator",
    description: "Estimate what your car is worth today — private-party, trade-in and dealer retail values — from its original price, age, mileage, condition and vehicle type.",
    metaTitle: "Car Value Calculator — What Is It Worth?",
    metaDescription: "Free car value calculator. Estimate what a car is worth from price, age, miles, condition and vehicle type / demand, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price (MSRP or What You Paid)", { default: 35000, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 4, max: 40, step: 0.5 }),
      CONDITION(),
      numberField("usage", "Odometer Mileage (0 = Unknown)", { unit: "miles", default: 48000, max: 960000, step: 1, required: false }),
      dropdown("option", "Vehicle Type / Demand", [["Sedan / hatchback", 0.95], ["SUV / crossover", 1.05], ["Pickup truck", 1.1], ["Electric vehicle", 0.88], ["Luxury car", 0.92]], 1.05),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Dealer Trade-In Value", format: "currency" },
      { key: "dealerRetailValue", label: "Dealer Retail Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years, the miles (leave 0 if unknown) and the condition, then choose the vehicle type / demand.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: a car (suv / crossover) bought for $35,000, 4 years old with 48,000 miles and in good condition is worth about $20,035.28 — 57.24% of its price — with a dealer trade-in value near $16,428.93.",
    assumptions: "Cars lose about 20% in the first year and roughly 12% a year after that, with mileage adjusted against 12,000 miles a year. Trucks and popular SUVs hold value best; EVs and luxury cars depreciate faster. For a precise number, compare with Kelley Blue Book, Edmunds and local listings for the same trim. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "How much is my car worth?", answer: "Start with the original price, then subtract depreciation for age and mileage and adjust for condition — most cars are worth about 40–50% of their price after 5 years." },
      { question: "Why is trade-in value lower than private sale?", answer: "Dealers need room to recondition and resell the car at a profit, so they typically offer 15–25% less than a private buyer would pay." },
    ],
  },
  {
    slug: "truck-value-calculator",
    title: "Truck Value Calculator",
    description: "Estimate the value of a used pickup truck — private-party, trade-in and dealer prices — from original price, age, mileage, condition and drivetrain.",
    metaTitle: "Truck Value Calculator — What Is It Worth?",
    metaDescription: "Free truck value calculator. Estimate what a pickup truck is worth from price, age, miles, condition and drivetrain, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price", { default: 50000, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 5, max: 40, step: 0.5 }),
      CONDITION(),
      numberField("usage", "Odometer Mileage (0 = Unknown)", { unit: "miles", default: 60000, max: 1200000, step: 1, required: false }),
      dropdown("option", "Drivetrain", [["2WD", 0.94], ["4WD / 4×4", 1.05]], 1.05),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Dealer Trade-In Value", format: "currency" },
      { key: "dealerRetailValue", label: "Dealer Retail Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years, the miles (leave 0 if unknown) and the condition, then choose the drivetrain.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: a pickup truck (4wd / 4×4) bought for $50,000, 5 years old with 60,000 miles and in good condition is worth about $30,601.58 — 61.20% of its price — with a dealer trade-in value near $25,399.31.",
    assumptions: "Pickups hold value better than most vehicles: about 15% lost in year one and 9% a year after, adjusted for mileage against 12,000 a year. Diesel engines, 4×4 and crew cabs add value; heavy towing wear, rust and modifications can reduce it. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "Do trucks hold their value?", answer: "Yes — full-size pickups like the F-150, Silverado and Tacoma often keep 55–65% of their value after five years." },
      { question: "Does 4WD add value to a truck?", answer: "Usually — 4×4 trucks sell for more and faster, especially in snowy and rural areas." },
    ],
  },
  {
    slug: "used-motorcycle-value-calculator",
    title: "Used Motorcycle Value Calculator",
    description: "Estimate what a used motorcycle is worth — private sale, trade-in and dealer price — by original price, age, mileage, condition and type of bike.",
    metaTitle: "Used Motorcycle Value Calculator — What Is It Worth?",
    metaDescription: "Free used motorcycle value calculator. Estimate what a motorcycle is worth from price, age and condition, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price", { default: 15000, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 4, max: 50, step: 0.5 }),
      CONDITION(),
      numberField("usage", "Mileage (0 = Unknown)", { unit: "miles", default: 12000, max: 240000, step: 1, required: false }),
      dropdown("option", "Motorcycle Type", [["Cruiser", 1.05], ["Sport bike", 0.93], ["Adventure / touring", 1.02], ["Dirt / dual-sport", 1]], 1.05),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Dealer Trade-In Value", format: "currency" },
      { key: "dealerRetailValue", label: "Dealer Retail Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years, the miles (leave 0 if unknown) and the condition, then choose the motorcycle type.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: a motorcycle (cruiser) bought for $15,000, 4 years old with 12,000 miles and in good condition is worth about $9,529.85 — 63.53% of its price — with a dealer trade-in value near $7,147.39.",
    assumptions: "Motorcycles lose about 20% in the first year and about 10% a year after, adjusted against 4,000 miles a year. Cruisers from big brands hold value best; sport bikes drop faster. Aftermarket parts rarely add their cost back. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "How much does a motorcycle depreciate?", answer: "Typically 20% in the first year and about half its value within five years, depending on brand and type." },
      { question: "What is high mileage for a motorcycle?", answer: "It depends on the bike — over about 50,000 miles is high for sport bikes, while big touring bikes routinely pass 100,000." },
    ],
  },
  {
    slug: "used-rv-value-calculator",
    title: "Used RV Value Calculator",
    description: "Estimate the value of a used RV — motorhome, camper van, travel trailer or fifth wheel — from original price, age, mileage, condition and type.",
    metaTitle: "Used RV Value Calculator — What Is It Worth?",
    metaDescription: "Free used rv value calculator. Estimate what an RV is worth from price, age, miles, condition and rv type, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price", { default: 120000, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 5, max: 40, step: 0.5 }),
      CONDITION(),
      numberField("usage", "Mileage (Motorhomes) (0 = Unknown)", { unit: "miles", default: 25000, max: 500000, step: 1, required: false }),
      dropdown("option", "RV Type", [["Class A motorhome", 0.95], ["Class B camper van", 1.1], ["Class C motorhome", 1], ["Travel trailer", 0.95], ["Fifth wheel", 1]], 1),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Dealer Trade-In Value", format: "currency" },
      { key: "dealerRetailValue", label: "Dealer Retail Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years, the miles (leave 0 if unknown) and the condition, then choose the rv type.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: an RV (class c motorhome) bought for $120,000, 5 years old with 25,000 miles and in good condition is worth about $64,475.37 — 53.73% of its price — with a dealer trade-in value near $48,356.52.",
    assumptions: "RVs lose about 20–30% when driven off the lot, then around 8% a year. Camper vans hold value best. Water damage, roof leaks and delamination cut value sharply — get an inspection. For towables, set mileage to 0. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "How fast do RVs depreciate?", answer: "Most lose 20–30% in the first year and about half their value in 5–7 years." },
      { question: "Is it better to sell an RV privately?", answer: "Usually — private sales typically bring 15–25% more than a dealer trade-in." },
    ],
  },
  {
    slug: "mobile-home-value-calculator",
    title: "Mobile Home Value Calculator",
    description: "Estimate what a mobile or manufactured home is worth from its original price, age, condition and whether it sits in a park or on owned land with a permanent foundation.",
    metaTitle: "Mobile Home Value Calculator — What Is It Worth?",
    metaDescription: "Free mobile home value calculator. Estimate what a manufactured home is worth from price, age, condition and location / setup, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price (Home Only)", { default: 90000, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 10, max: 60, step: 0.5 }),
      CONDITION(),
      dropdown("option", "Location / Setup", [["Rented lot in a park", 0.85], ["Owned land, not on a permanent foundation", 1.05], ["Owned land, permanent foundation (real property)", 1.25]], 0.85),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Dealer Buyout Offer", format: "currency" },
      { key: "dealerRetailValue", label: "Dealer Resale Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years and the condition, then choose the location / setup.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: a manufactured home (rented lot in a park) bought for $90,000, 10 years old and in good condition is worth about $49,963.14 — 55.51% of its price — with a dealer buyout offer near $39,970.52.",
    assumptions: "Homes in parks depreciate slowly (about 3–4% a year after the first year) like personal property; homes on owned land with a permanent foundation can be titled as real estate and often hold or gain value with the land. Land value isn't included — add it separately. Check the NADA manufactured-housing guide too. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "Do mobile homes lose value?", answer: "Homes on rented lots usually depreciate, while those on owned land with a permanent foundation can appreciate with the land." },
      { question: "How can I find my mobile home's value?", answer: "Use its size, year, make and condition with a guide like JD Power (NADA) and compare recent sales in the same park or area." },
    ],
  },
  {
    slug: "trailer-value-calculator",
    title: "Trailer Value Calculator",
    description: "Estimate the value of a used utility, cargo, car hauler, livestock or dump trailer from its original price, age, condition and type.",
    metaTitle: "Trailer Value Calculator — What Is It Worth?",
    metaDescription: "Free trailer value calculator. Estimate what a trailer is worth from price, age, condition and trailer type, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price", { default: 8000, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 5, max: 50, step: 0.5 }),
      CONDITION(),
      dropdown("option", "Trailer Type", [["Utility", 1], ["Enclosed cargo", 1.05], ["Car hauler / equipment", 1.05], ["Horse / livestock", 1], ["Dump trailer", 1.1]], 1.05),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Dealer Trade-In Value", format: "currency" },
      { key: "dealerRetailValue", label: "Dealer Retail Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years and the condition, then choose the trailer type.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: a trailer (enclosed cargo) bought for $8,000, 5 years old and in good condition is worth about $5,574.55 — 69.68% of its price — with a dealer trade-in value near $4,459.64.",
    assumptions: "Trailers hold value well: about 15% lost in year one, then roughly 6% a year, with a floor of about 20% of the price. Rust, frame damage, worn tires, lights and missing titles reduce value; new tires and brakes help. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "Do trailers hold their value?", answer: "Yes — well-kept trailers often sell for 60–75% of their price after five years." },
      { question: "What lowers a trailer's value?", answer: "Rust or frame damage, rotten decking, bad bearings and tires, and title problems." },
    ],
  },
  {
    slug: "atv-value-calculator",
    title: "ATV Value Calculator",
    description: "Estimate the value of a used ATV (four-wheeler) from its original price, age, miles, condition and brand — private sale, trade-in and dealer prices.",
    metaTitle: "ATV Value Calculator — What Is It Worth?",
    metaDescription: "Free atv value calculator. Estimate what an ATV is worth from price, age, miles, condition and brand, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price", { default: 10000, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 4, max: 40, step: 0.5 }),
      CONDITION(),
      numberField("usage", "Mileage (0 = Unknown)", { unit: "miles", default: 4000, max: 80000, step: 1, required: false }),
      dropdown("option", "Brand", [["Honda / Yamaha", 1.05], ["Polaris / Can-Am / Kawasaki", 1], ["Other / import brand", 0.8]], 1),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Dealer Trade-In Value", format: "currency" },
      { key: "dealerRetailValue", label: "Dealer Retail Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years, the miles (leave 0 if unknown) and the condition, then choose the brand.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: an ATV (polaris / can-am / kawasaki) bought for $10,000, 4 years old with 4,000 miles and in good condition is worth about $5,832.00 — 58.32% of its price — with a dealer trade-in value near $4,374.00.",
    assumptions: "ATVs lose about 20% in the first year and around 10% a year after, adjusted against 1,000 miles a year. Honda and Yamaha hold value best. Hours, mud use, plastics and accessories like winches and plows affect price. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "How much is my four-wheeler worth?", answer: "Most well-kept ATVs sell for about 50–65% of their price after 4–5 years." },
      { question: "What is high mileage for an ATV?", answer: "Over about 5,000–10,000 miles or 500+ hours is considered high, though good maintenance matters most." },
    ],
  },
  {
    slug: "utv-value-calculator",
    title: "UTV Value Calculator",
    description: "Estimate the value of a used UTV or side-by-side from original price, age, miles, condition and brand — private-party, trade-in and dealer values.",
    metaTitle: "UTV Value Calculator — What Is It Worth?",
    metaDescription: "Free utv value calculator. Estimate what a UTV / side-by-side is worth from price, age, miles, condition and brand, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price", { default: 20000, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 4, max: 40, step: 0.5 }),
      CONDITION(),
      numberField("usage", "Mileage (0 = Unknown)", { unit: "miles", default: 6000, max: 120000, step: 1, required: false }),
      dropdown("option", "Brand", [["Honda / Yamaha / Kubota", 1.05], ["Polaris / Can-Am / Kawasaki", 1], ["Other / import brand", 0.8]], 1),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Dealer Trade-In Value", format: "currency" },
      { key: "dealerRetailValue", label: "Dealer Retail Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years, the miles (leave 0 if unknown) and the condition, then choose the brand.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: a UTV / side-by-side (polaris / can-am / kawasaki) bought for $20,000, 4 years old with 6,000 miles and in good condition is worth about $11,664.00 — 58.32% of its price — with a dealer trade-in value near $8,748.00.",
    assumptions: "Side-by-sides lose about 20% in year one and around 10% a year after, adjusted against 1,500 miles a year. Work UTVs (Kubota, Ranger) hold value well; high-performance sport models depreciate faster. Cabs, doors and plows add some value. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "Do UTVs hold their value?", answer: "Fairly well — many sell for 55–70% of their price after a few years, especially popular work models." },
      { question: "Do accessories add to a UTV's value?", answer: "Some — cabs, roofs and winches help, but buyers rarely pay their full cost." },
    ],
  },
  {
    slug: "used-snowmobile-value-calculator",
    title: "Used Snowmobile Value Calculator",
    description: "Estimate what a used snowmobile (sled) is worth from its original price, age, miles and condition — private sale, trade-in and dealer prices.",
    metaTitle: "Used Snowmobile Value Calculator — What Is It Worth?",
    metaDescription: "Free used snowmobile value calculator. Estimate what a snowmobile is worth from price, age, miles and condition, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price", { default: 14000, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 5, max: 50, step: 0.5 }),
      CONDITION(),
      numberField("usage", "Mileage (0 = Unknown)", { unit: "miles", default: 6000, max: 120000, step: 1, required: false }),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Dealer Trade-In Value", format: "currency" },
      { key: "dealerRetailValue", label: "Dealer Retail Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years, the miles (leave 0 if unknown) and the condition.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: a snowmobile bought for $14,000, 5 years old with 6,000 miles and in good condition is worth about $7,164.61 — 51.18% of its price — with a dealer trade-in value near $5,158.52.",
    assumptions: "Snowmobiles lose about 22% in the first year and around 10% a year after, adjusted against 1,200 miles a year. Prices peak in fall and early winter and fall in spring. Track, skis, compression and service records matter. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "What is high mileage for a snowmobile?", answer: "Over about 8,000–10,000 miles is high for most sleds, though 4-strokes last longer than 2-strokes." },
      { question: "When is the best time to sell a snowmobile?", answer: "In fall before the first snow, when buyer demand is highest." },
    ],
  },
  {
    slug: "used-golf-cart-value-calculator",
    title: "Used Golf Cart Value Calculator",
    description: "Estimate the value of a used golf cart — gas or electric — from original price, age, condition and battery type.",
    metaTitle: "Used Golf Cart Value Calculator — What Is It Worth?",
    metaDescription: "Free used golf cart value calculator. Estimate what a golf cart is worth from price, age, condition and power, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price", { default: 11000, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 5, max: 40, step: 0.5 }),
      CONDITION(),
      dropdown("option", "Power", [["Gas", 1], ["Electric, lead-acid batteries", 0.9], ["Electric, lithium battery", 1.1]], 0.9),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Dealer Trade-In Value", format: "currency" },
      { key: "dealerRetailValue", label: "Dealer Retail Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years and the condition, then choose the power.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: a golf cart (electric, lead-acid batteries) bought for $11,000, 5 years old and in good condition is worth about $5,924.57 — 53.86% of its price — with a dealer trade-in value near $4,147.20.",
    assumptions: "Golf carts lose about 20% in year one and around 7% a year after. Club Car, E-Z-GO and Yamaha hold value best. For electric carts, battery age matters most — a new lead-acid set costs $800–$1,500 and lithium $2,000–$4,000. Street-legal upgrades add value. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "How much is a used golf cart worth?", answer: "Most sell for $3,000–$8,000 depending on age, brand, batteries and upgrades." },
      { question: "Do golf cart batteries affect value?", answer: "A lot — old lead-acid batteries can cut $1,000+ off the price, while a recent lithium battery adds value." },
    ],
  },
  {
    slug: "used-scooter-value-calculator",
    title: "Used Scooter Value Calculator",
    description: "Estimate what a used scooter or moped is worth — gas or electric — from original price, age, mileage and condition.",
    metaTitle: "Used Scooter Value Calculator — What Is It Worth?",
    metaDescription: "Free used scooter value calculator. Estimate what a scooter is worth from price, age, miles, condition and scooter type, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price", { default: 4000, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 3, max: 30, step: 0.5 }),
      CONDITION(),
      numberField("usage", "Mileage (0 = Unknown)", { unit: "miles", default: 6000, max: 120000, step: 1, required: false }),
      dropdown("option", "Scooter Type", [["Gas scooter / moped (Vespa, Honda)", 1], ["Electric scooter / moped", 0.85]], 1),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Dealer Trade-In Value", format: "currency" },
      { key: "dealerRetailValue", label: "Dealer Retail Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years, the miles (leave 0 if unknown) and the condition, then choose the scooter type.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: a scooter (gas scooter / moped) bought for $4,000, 3 years old with 6,000 miles and in good condition is worth about $2,392.90 — 59.82% of its price — with a dealer trade-in value near $1,555.38.",
    assumptions: "Scooters lose about 25% in the first year and about 12% a year after, adjusted against 2,500 miles a year. Vespa and Honda hold value best; electric models depreciate faster because of battery wear. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "Do Vespas hold their value?", answer: "Better than most scooters — well-kept Vespas often keep 50–60% of their price after 5 years." },
      { question: "How long do electric scooter batteries last?", answer: "Typically 500–1,000 charge cycles, or about 3–5 years of regular use." },
    ],
  },
  {
    slug: "used-tractor-value-calculator",
    title: "Used Tractor Value Calculator",
    description: "Estimate the value of a used farm or compact tractor from original price, age, engine hours, condition and brand.",
    metaTitle: "Used Tractor Value Calculator — What Is It Worth?",
    metaDescription: "Free used tractor value calculator. Estimate what a tractor is worth from price, age, hours, condition and brand, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price", { default: 45000, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 8, max: 60, step: 0.5 }),
      CONDITION(),
      numberField("usage", "Engine Hours (0 = Unknown)", { unit: "hours", default: 2400, max: 48000, step: 1, required: false }),
      dropdown("option", "Brand", [["John Deere / Kubota", 1.08], ["Other major brand (Case IH, New Holland, Massey)", 1], ["Off-brand / import", 0.85]], 1.08),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Dealer Trade-In Value", format: "currency" },
      { key: "dealerRetailValue", label: "Dealer Retail Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years, the hours (leave 0 if unknown) and the condition, then choose the brand.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: a tractor (john deere / kubota) bought for $45,000, 8 years old with 2,400 hours and in good condition is worth about $26,788.61 — 59.53% of its price — with a dealer trade-in value near $21,966.66.",
    assumptions: "Tractors hold value well: about 15% lost in year one, then roughly 6% a year, adjusted against 300 hours a year. Loaders, 4WD and cabs add value. Auction results for the same model and hours are the best guide. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "What is high hours for a tractor?", answer: "For compact tractors, over about 2,000–3,000 hours is high; large farm tractors often run 10,000+ hours." },
      { question: "Do tractors hold their value?", answer: "Yes — popular brands often keep 60%+ of their value after five years." },
    ],
  },
  {
    slug: "forklift-value-calculator",
    title: "Forklift Value Calculator",
    description: "Estimate the value of a used forklift from original price, age, hour meter reading, condition and fuel type.",
    metaTitle: "Forklift Value Calculator — What Is It Worth?",
    metaDescription: "Free forklift value calculator. Estimate what a forklift is worth from price, age, hours, condition and fuel type, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price", { default: 30000, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 6, max: 40, step: 0.5 }),
      CONDITION(),
      numberField("usage", "Hour Meter (0 = Unknown)", { unit: "hours", default: 9000, max: 180000, step: 1, required: false }),
      dropdown("option", "Fuel Type", [["Electric", 0.95], ["LPG (propane)", 1], ["Diesel", 1.05]], 1),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Dealer Buyout Offer", format: "currency" },
      { key: "dealerRetailValue", label: "Used Dealer Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years, the hours (leave 0 if unknown) and the condition, then choose the fuel type.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: a forklift (lpg) bought for $30,000, 6 years old with 9,000 hours and in good condition is worth about $14,171.76 — 47.24% of its price — with a dealer buyout offer near $10,628.82.",
    assumptions: "Forklifts lose about 20% in the first year and around 10% a year after, adjusted against 1,500 hours a year. Around 10,000 hours is considered high for internal-combustion models. Electric forklifts need battery checks — replacements cost $3,000–$8,000. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "How many hours is a lot for a forklift?", answer: "About 10,000 hours for propane and diesel forklifts; electric models often last longer." },
      { question: "How much is a used forklift worth?", answer: "Common warehouse forklifts sell for about $8,000–$20,000 used, depending on hours, capacity and condition." },
    ],
  },
  {
    slug: "school-bus-value-calculator",
    title: "School Bus Value Calculator",
    description: "Estimate the value of a used school bus — for fleets, churches or skoolie conversions — from original price, age, mileage, condition and likely buyer.",
    metaTitle: "School Bus Value Calculator — What Is It Worth?",
    metaDescription: "Free school bus value calculator. Estimate what a school bus is worth from price, age, miles, condition and likely buyer, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price", { default: 110000, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 12, max: 50, step: 0.5 }),
      CONDITION(),
      numberField("usage", "Mileage (0 = Unknown)", { unit: "miles", default: 150000, max: 3000000, step: 1, required: false }),
      dropdown("option", "Likely Buyer", [["Another fleet / church / camp", 1], ["Skoolie (conversion) buyer", 1.05], ["Parts / scrap buyer", 0.5]], 1),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Typical Auction Price", format: "currency" },
      { key: "dealerRetailValue", label: "Bus Dealer Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years, the miles (leave 0 if unknown) and the condition, then choose the likely buyer.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: a school bus (another fleet / church / camp) bought for $110,000, 12 years old with 150,000 miles and in good condition is worth about $11,285.70 — 10.26% of its price — with a typical auction price near $9,028.56.",
    assumptions: "School buses lose about 20% in the first year and about 17% a year after; most are retired at 12–15 years and sell at auction for a few thousand dollars. Diesel engine type, transmission, rust and air brakes matter. Skoolie buyers favor short buses and rear-engine models. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "How much does a used school bus cost?", answer: "Retired full-size buses often sell for $3,000–$10,000 at auction; newer or short buses cost more." },
      { question: "What's the best bus for a skoolie?", answer: "Many builders prefer rear-engine or short buses with low rust and a reliable diesel and automatic transmission." },
    ],
  },
  {
    slug: "lawn-mower-value-calculator",
    title: "Lawn Mower Value Calculator",
    description: "Estimate what a used push, riding or zero-turn lawn mower is worth from its original price, age, engine hours and condition.",
    metaTitle: "Lawn Mower Value Calculator — What Is It Worth?",
    metaDescription: "Free lawn mower value calculator. Estimate what a lawn mower is worth from price, age, hours, condition and mower type, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price", { default: 3500, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 4, max: 40, step: 0.5 }),
      CONDITION(),
      numberField("usage", "Engine Hours (0 = Unknown)", { unit: "hours", default: 200, max: 4000, step: 1, required: false }),
      dropdown("option", "Mower Type", [["Push / self-propelled", 0.9], ["Riding mower / lawn tractor", 1], ["Zero-turn", 1.05]], 1),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Quick-Sale Price", format: "currency" },
      { key: "dealerRetailValue", label: "Dealer / Shop Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years, the hours (leave 0 if unknown) and the condition, then choose the mower type.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: a lawn mower (riding mower / lawn tractor) bought for $3,500, 4 years old with 200 hours and in good condition is worth about $1,913.63 — 54.68% of its price — with a quick-sale price near $1,530.90.",
    assumptions: "Mowers lose about 25% in the first year and about 10% a year after, adjusted against 50 hours a year. Commercial-grade and well-known brands hold value; sell in spring for the best price. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "How many hours does a riding mower last?", answer: "Residential riders often last 400–700 hours; commercial zero-turns can reach 1,500+ hours." },
      { question: "When is the best time to sell a lawn mower?", answer: "Early spring, when buyers are getting ready for the mowing season." },
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
