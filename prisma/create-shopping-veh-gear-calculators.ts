// One-time (but safe to re-run) batch setup script: creates 14 used electronics, home goods and instrument value tools
// from the user's shopping list (Shopping Calculators > Vehicle, Resale & Collectibles Calculators).
// See src/lib/calc-engine-shopping-veh-gear.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-veh-gear-calculators.ts
// or
//   npm run db:create-shopping-veh-gear-calculators

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
    slug: "used-phone-value-calculator",
    title: "Used Phone Value Calculator",
    description: "Estimate what your used smartphone is worth — selling it yourself, trading it in or buying refurbished — by brand, original price, age and condition.",
    metaTitle: "Used Phone Value Calculator — What Is It Worth?",
    metaDescription: "Free used phone value calculator. Estimate what a smartphone is worth from price, age, condition and brand, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price", { default: 800, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 2, max: 10, step: 0.5 }),
      CONDITION(),
      dropdown("option", "Brand", [["Apple iPhone", 1.15], ["Samsung Galaxy", 0.9], ["Google Pixel", 0.85], ["Other Android", 0.6]], 0.9),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Trade-In / Buyback Offer", format: "currency" },
      { key: "dealerRetailValue", label: "Refurbished Retail Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years and the condition, then choose the brand.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: a smartphone (samsung galaxy) bought for $800, 2 years old and in good condition is worth about $374.40 — 46.80% of its price — with a trade-in / buyback offer near $262.08.",
    assumptions: "Phones lose about 35% in the first year and 20% a year after; iPhones hold value best. Cracked screens, bad batteries, carrier locks and missing iCloud/Google account removal reduce value or make the phone unsellable. Carrier trade-in promotions can beat these numbers when tied to a new plan. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "How much is my old phone worth?", answer: "Most 2-year-old flagship phones sell for about 35–55% of their original price." },
      { question: "Where do I get the most for my phone?", answer: "Selling privately usually pays most; buyback sites and trade-ins are faster but pay 20–40% less." },
    ],
  },
  {
    slug: "iphone-resale-value-calculator",
    title: "iPhone Resale Value Calculator",
    description: "Estimate an iPhone's resale value from its original price, age, condition and battery health — private sale, trade-in and refurbished prices.",
    metaTitle: "iPhone Resale Value Calculator — What Is It Worth?",
    metaDescription: "Free iphone resale value calculator. Estimate what an iPhone is worth from price, age, condition and battery health, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price (Including Storage Upgrade)", { default: 999, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 2, max: 10, step: 0.5 }),
      CONDITION(),
      dropdown("option", "Battery Health", [["90% or higher", 1.05], ["85–89%", 1], ["80–84%", 0.92], ["Under 80% (service)", 0.82]], 1),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Trade-In / Buyback Offer", format: "currency" },
      { key: "dealerRetailValue", label: "Refurbished Retail Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years and the condition, then choose the battery health.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: an iPhone (85–89%) bought for $999, 2 years old and in good condition is worth about $636.86 — 63.75% of its price — with a trade-in / buyback offer near $445.80.",
    assumptions: "iPhones lose about 25% in the first year and around 15% a year after — slower than other phones. Value falls each September when new models launch. Unlocked phones sell for more; activation-locked phones are worth parts only. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "How much is my iPhone worth?", answer: "A 2-year-old iPhone often sells for 50–60% of its original price in good condition." },
      { question: "When is the best time to sell an iPhone?", answer: "In August, before Apple's September launch event pushes used prices down." },
    ],
  },
  {
    slug: "used-laptop-value-calculator",
    title: "Used Laptop Value Calculator",
    description: "Estimate what a used laptop is worth — MacBook, Windows, gaming or Chromebook — from original price, age and condition, with trade-in and refurbished prices.",
    metaTitle: "Used Laptop Value Calculator — What Is It Worth?",
    metaDescription: "Free used laptop value calculator. Estimate what a laptop is worth from price, age, condition and laptop type, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price", { default: 1200, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 3, max: 15, step: 0.5 }),
      CONDITION(),
      dropdown("option", "Laptop Type", [["MacBook", 1.2], ["Premium Windows (XPS, ThinkPad X1, Surface)", 0.9], ["Gaming laptop", 0.95], ["Budget / Chromebook", 0.7]], 1.2),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Trade-In / Buyback Offer", format: "currency" },
      { key: "dealerRetailValue", label: "Refurbished Retail Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years and the condition, then choose the laptop type.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: a laptop (macbook) bought for $1,200, 3 years old and in good condition is worth about $645.12 — 53.76% of its price — with a trade-in / buyback offer near $419.33.",
    assumptions: "Laptops lose about 30% in year one and 20% a year after; MacBooks hold value best. Battery wear, screen damage, low RAM/storage and missing chargers reduce value. Wipe the drive and remove accounts before selling. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "How much is my used MacBook worth?", answer: "A 3-year-old MacBook in good shape often sells for about 45–55% of its original price." },
      { question: "Do gaming laptops hold their value?", answer: "Not especially — newer GPUs quickly make older models less desirable." },
    ],
  },
  {
    slug: "used-appliance-value-calculator",
    title: "Used Appliance Value Calculator",
    description: "Estimate the resale price of a used refrigerator, washer, dryer, range or dishwasher from original price, age and condition.",
    metaTitle: "Used Appliance Value Calculator — What Is It Worth?",
    metaDescription: "Free used appliance value calculator. Estimate what an appliance is worth from price, age, condition and appliance, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price", { default: 1200, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 5, max: 30, step: 0.5 }),
      CONDITION(),
      dropdown("option", "Appliance", [["Refrigerator", 1], ["Washer or dryer", 0.95], ["Range / oven", 1], ["Dishwasher", 0.85], ["Microwave / small appliance", 0.6]], 1),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Quick-Sale / Dealer Offer", format: "currency" },
      { key: "dealerRetailValue", label: "Used-Appliance Store Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years and the condition, then choose the appliance.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: an appliance (refrigerator) bought for $1,200, 5 years old and in good condition is worth about $551.12 — 45.93% of its price — with a quick-sale / dealer offer near $330.67.",
    assumptions: "Major appliances lose about 30% once installed and about 10% a year after. Stainless finishes, popular brands and working ice makers help; dents, odors and missing parts hurt. Used-appliance stores resell refurbished units with short warranties. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "What is a used refrigerator worth?", answer: "Typically 25–50% of its original price if it's under 7 years old and works well." },
      { question: "Is it worth selling old appliances?", answer: "Working appliances under about 8–10 years old usually sell; older ones may only be worth scrap or a free pickup." },
    ],
  },
  {
    slug: "appliance-depreciation-calculator",
    title: "Appliance Depreciation Calculator",
    description: "Find an appliance's depreciated (actual cash) value from its price, age and useful life — the number used for insurance claims, rental deposits and landlord taxes.",
    metaTitle: "Appliance Depreciation Calculator — What Is It Worth?",
    metaDescription: "Free appliance depreciation calculator. Find an appliance's depreciated actual cash value from price, age, useful life and condition.",
    calcInputs: [
      currencyField("originalPrice", "Original Price (Installed)", { default: 1500, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 5, max: 30, step: 0.5 }),
      CONDITION(),
      dropdown("option", "Appliance Type (Useful Life in Years)", [["Refrigerator (13)", 13], ["Washer (11)", 11], ["Dryer (13)", 13], ["Dishwasher (10)", 10], ["Range / oven (15)", 15], ["Microwave (9)", 9], ["Water heater (11)", 11], ["Furnace / AC (15)", 15]], 13),
    ],
    calcResult: { label: "Depreciated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Depreciated Value (Actual Cash Value)", format: "currency", highlight: true },
      { key: "totalDepreciation", label: "Total Depreciation", format: "currency" },
      { key: "percentRetained", label: "Value Remaining (%)", format: "percentage" },
      { key: "averagePerYear", label: "Depreciation per Year", format: "currency" },
      { key: "tradeInValue", label: "Typical Resale Price", format: "currency" },
    ],
    instructions: "Enter what the appliance cost new (including installation), its age and its type, which sets the useful life. Pick its condition — well-kept appliances can be valued a little higher.",
    examples: "Example: a refrigerator bought for $1,500 five years ago (13-year life) in good condition has a depreciated value of about $923.08 — 61.54% of its price.",
    assumptions: "Straight-line depreciation: value = price × (1 − age ÷ useful life), with a 10% salvage floor and a condition adjustment. Useful lives follow common industry and claims tables. For US rental property taxes, appliances use 5-year MACRS instead. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "How do insurers calculate appliance depreciation?", answer: "Usually straight-line over a useful life — a 13-year refrigerator loses about 7.7% of its price a year — to find actual cash value." },
      { question: "What is actual cash value?", answer: "Replacement cost minus depreciation; replacement-cost policies later pay the difference once you replace the item." },
    ],
  },
  {
    slug: "used-furniture-value-depreciation-calculator",
    title: "Used Furniture Value Depreciation Calculator",
    description: "Estimate what used furniture is worth to resell — sofas, dining sets, dressers and more — from original price, age, condition and how it's made.",
    metaTitle: "Used Furniture Value Depreciation Calculator",
    metaDescription: "Free used furniture value depreciation calculator. Estimate what a piece of furniture is worth from price, age and condition, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price", { default: 2000, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 3, max: 50, step: 0.5 }),
      CONDITION(),
      dropdown("option", "Furniture Type", [["Solid wood", 1.2], ["Designer / name brand", 1.3], ["Mass-market (particleboard)", 0.6], ["Upholstered (sofa, chairs)", 0.8]], 0.8),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Quick Cash Offer", format: "currency" },
      { key: "dealerRetailValue", label: "Consignment / Vintage Shop Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years and the condition, then choose the furniture type.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: a piece of furniture (upholstered) bought for $2,000, 3 years old and in good condition is worth about $648.00 — 32.40% of its price — with a quick cash offer near $388.80.",
    assumptions: "Most furniture loses about half its value as soon as it's used, then about 10% a year. Solid wood and well-known designer pieces hold value; particleboard and worn upholstery don't. Consignment shops usually keep 30–50% of the sale price. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "How much is used furniture worth?", answer: "Typically 20–50% of the original price, more for solid wood or designer pieces in great condition." },
      { question: "What's the best way to sell used furniture?", answer: "Local marketplaces for quick sales; consignment for higher-end pieces if you can wait." },
    ],
  },
  {
    slug: "used-hot-tub-value-calculator",
    title: "Used Hot Tub Value Calculator",
    description: "Estimate what a used hot tub or spa is worth from original price, age, condition and brand — plus quick-sale and refurbished prices.",
    metaTitle: "Used Hot Tub Value Calculator — What Is It Worth?",
    metaDescription: "Free used hot tub value calculator. Estimate what a hot tub is worth from price, age, condition and hot tub type, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price", { default: 9000, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 6, max: 30, step: 0.5 }),
      CONDITION(),
      dropdown("option", "Hot Tub Type", [["Premium brand (Hot Spring, Jacuzzi, Sundance)", 1.15], ["Mid-range", 1], ["Plug-and-play", 0.8], ["Inflatable", 0.4]], 1),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Quick-Sale Price", format: "currency" },
      { key: "dealerRetailValue", label: "Dealer Refurbished Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years and the condition, then choose the hot tub type.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: a hot tub (mid-range) bought for $9,000, 6 years old and in good condition is worth about $4,152.21 — 46.14% of its price — with a quick-sale price near $3,114.16.",
    assumptions: "Hot tubs lose about 30% once installed and around 8% a year after. Buyers usually pay $300–$800+ for moving. A new cover ($400–$700) and a working heater and pumps raise value; leaks and cracked shells cut it to near zero. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "How much is a used hot tub worth?", answer: "Usually 25–50% of the original price for a working tub under about 10 years old." },
      { question: "Who pays to move a used hot tub?", answer: "Usually the buyer, which is why moving costs are a big part of the deal." },
    ],
  },
  {
    slug: "used-mattress-price-calculator",
    title: "Used Mattress Price Calculator",
    description: "Find a fair price for selling (or buying) a used mattress from its original price, age, type and condition.",
    metaTitle: "Used Mattress Price Calculator — What Is It Worth?",
    metaDescription: "Free used mattress price calculator. Estimate what a mattress is worth from price, age, condition and mattress type, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price", { default: 1500, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 2, max: 15, step: 0.5 }),
      CONDITION(),
      dropdown("option", "Mattress Type", [["Memory foam", 0.9], ["Hybrid", 1.05], ["Innerspring", 0.85], ["Latex", 1.15]], 1.05),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Quick-Sale Price", format: "currency" },
      { key: "dealerRetailValue", label: "Listing Price to Start At", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years and the condition, then choose the mattress type.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: a mattress (hybrid) bought for $1,500, 2 years old and in good condition is worth about $602.44 — 40.16% of its price — with a quick-sale price near $421.71.",
    assumptions: "Used mattresses lose more than half their value immediately, then about 15% a year. Clean, stain-free mattresses with a protector, original tags and remaining warranty (often non-transferable) sell best. Some areas restrict selling used bedding without sanitizing. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "Can you sell a used mattress?", answer: "Yes in most places, if it's clean and in good condition — some states require sanitizing and a label for resellers." },
      { question: "How much is a used mattress worth?", answer: "Usually 20–40% of the original price if it's under 3 years old and spotless." },
    ],
  },
  {
    slug: "guitar-value-calculator",
    title: "Guitar Value Calculator",
    description: "Estimate what a used electric or acoustic guitar is worth from original price, age, condition and make — private sale, store trade-in and used retail prices.",
    metaTitle: "Guitar Value Calculator — What Is It Worth?",
    metaDescription: "Free guitar value calculator. Estimate what a guitar is worth from price, age, condition and make / category, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price", { default: 1500, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 5, max: 80, step: 0.5 }),
      CONDITION(),
      dropdown("option", "Make / Category", [["Fender / Gibson USA, Martin, Taylor", 1.15], ["Import (Squier, Epiphone, Yamaha)", 0.8], ["Boutique / custom shop", 1.25], ["Vintage (pre-1980)", 2]], 1.15),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Music Store Trade-In Offer", format: "currency" },
      { key: "dealerRetailValue", label: "Used Music Store Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years and the condition, then choose the make / category.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: a guitar (fender / gibson usa, martin, taylor) bought for $1,500, 5 years old and in good condition is worth about $1,193.31 — 79.55% of its price — with a music store trade-in offer near $656.32.",
    assumptions: "Quality guitars lose about 25% when they leave the store, then hold value well (about 2% a year); vintage instruments often appreciate. Originality, refinishes, repairs and case/paperwork matter. Check Reverb sold listings for the same model and year. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "Do guitars hold their value?", answer: "Good-brand guitars hold value well after the initial drop, and vintage American guitars often gain value." },
      { question: "How much will a music store pay for my guitar?", answer: "Usually about 40–60% of what they expect to resell it for." },
    ],
  },
  {
    slug: "piano-value-calculator",
    title: "Piano Value Calculator",
    description: "Estimate what a used upright, grand or digital piano is worth from original price, age, condition and make.",
    metaTitle: "Piano Value Calculator — What Is It Worth?",
    metaDescription: "Free piano value calculator. Estimate what a piano is worth from price, age, condition and make, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price", { default: 12000, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 15, max: 100, step: 0.5 }),
      CONDITION(),
      dropdown("option", "Make", [["Steinway / Bösendorfer / Fazioli", 1.8], ["Yamaha / Kawai", 1.1], ["Other acoustic brand", 0.75], ["Digital piano", 0.6]], 1.1),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Dealer Buyout Offer", format: "currency" },
      { key: "dealerRetailValue", label: "Rebuilt / Dealer Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years and the condition, then choose the make.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: a piano (yamaha / kawai) bought for $12,000, 15 years old and in good condition is worth about $5,962.95 — 49.69% of its price — with a dealer buyout offer near $3,577.77.",
    assumptions: "Acoustic pianos lose about 20% at first and about 4% a year after; top makers hold value far better. Many old uprights are worth little and cost $300–$800 to move. A technician's appraisal (soundboard, pin block, action) is the best guide. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "Are old pianos worth anything?", answer: "Quality brands can be valuable, but many old uprights sell for little or are given away because moving costs exceed their value." },
      { question: "How much does it cost to move a piano?", answer: "Typically $200–$800 locally for an upright and $400–$1,500+ for a grand." },
    ],
  },
  {
    slug: "clarinet-value-calculator",
    title: "Clarinet Value Calculator",
    description: "Estimate what a used clarinet is worth — student, intermediate or professional — from its original price, age, condition and grade.",
    metaTitle: "Clarinet Value Calculator — What Is It Worth?",
    metaDescription: "Free clarinet value calculator. Estimate what a clarinet is worth from price, age, condition and grade, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price", { default: 1500, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 5, max: 80, step: 0.5 }),
      CONDITION(),
      dropdown("option", "Grade", [["Professional wood (Buffet R13, Selmer)", 1.2], ["Intermediate wood", 1], ["Student plastic", 0.6]], 1),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Music Store Trade-In Offer", format: "currency" },
      { key: "dealerRetailValue", label: "Used Music Store Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years and the condition, then choose the grade.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: a clarinet (intermediate wood) bought for $1,500, 5 years old and in good condition is worth about $855.23 — 57.02% of its price — with a music store trade-in offer near $470.38.",
    assumptions: "Clarinets lose about 30% at first, then about 5% a year. Cracks in wooden bodies, worn pads and bent keys reduce value; a fresh repad costs $150–$400. Professional Buffet R13s hold value best. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "How much is a used clarinet worth?", answer: "Student clarinets often sell for $100–$300 used; professional wooden models $1,000–$3,000+." },
      { question: "Is a cracked clarinet worth anything?", answer: "Yes — pinned cracks can be repaired, but the value drops and buyers will want a discount." },
    ],
  },
  {
    slug: "watch-value-calculator",
    title: "Watch Value Calculator",
    description: "Estimate the resale value of a luxury or everyday watch from its retail price, age, condition and brand — what a buyer pays you and pre-owned dealer prices.",
    metaTitle: "Watch Value Calculator — What Is It Worth?",
    metaDescription: "Free watch value calculator. Estimate what a watch is worth from price, age, condition and brand, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price (Retail)", { default: 8000, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 5, max: 100, step: 0.5 }),
      CONDITION(),
      dropdown("option", "Brand", [["Rolex / Patek Philippe / Audemars Piguet", 1.35], ["Omega / Cartier / Tudor", 0.95], ["Other Swiss luxury", 0.75], ["Fashion / quartz", 0.3]], 1.35),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Dealer Buy Price", format: "currency" },
      { key: "dealerRetailValue", label: "Pre-Owned Dealer Price", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years and the condition, then choose the brand.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: a watch (rolex / patek philippe / audemars piguet) bought for $8,000, 5 years old and in good condition is worth about $9,352.21 — 116.90% of its price — with a dealer buy price near $7,481.77.",
    assumptions: "Most watches lose about 20% once worn; top brands can then gain about 2% a year, while fashion watches keep only a fraction of their price. Original box and papers add 10–20%; over-polishing and aftermarket parts reduce value. Check sold listings for the exact reference number. A negative \"value lost\" means the watch has gained value. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "Do Rolex watches hold their value?", answer: "Many popular Rolex models sell at or above retail on the pre-owned market, especially steel sports models." },
      { question: "Do box and papers matter when selling a watch?", answer: "Yes — a full set often adds 10–20% and makes the watch easier to sell." },
    ],
  },
  {
    slug: "clothing-resale-calculator",
    title: "Clothing Resale Calculator",
    description: "Find what to list used clothing for on Poshmark, eBay, Depop or Vinted — from original price, brand tier, age and condition — plus what a buy-back store might pay.",
    metaTitle: "Clothing Resale Calculator — What Is It Worth?",
    metaDescription: "Free clothing resale calculator. Estimate what a piece of clothing is worth from price, age, condition and brand tier, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price", { default: 120, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 2, max: 30, step: 0.5 }),
      CONDITION(),
      dropdown("option", "Brand Tier", [["Luxury designer", 1.5], ["Premium (Lululemon, Patagonia, Arc'teryx)", 1.1], ["Mall brand", 0.6], ["Fast fashion", 0.3]], 1.1),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Buy-Back / Consignment Payout", format: "currency" },
      { key: "dealerRetailValue", label: "Listing Price to Start At", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years and the condition, then choose the brand tier.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: a piece of clothing (premium) bought for $120, 2 years old and in good condition is worth about $47.52 — 39.60% of its price — with a buy-back / consignment payout near $16.63.",
    assumptions: "Most clothing resells for 20–40% of retail; luxury and in-demand premium brands sell higher. New with tags (choose Excellent) commands the most. Selling platforms take about 10–20% in fees, and buy-back stores pay much less for instant cash. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "How much should I sell used clothes for?", answer: "About a third of retail for good brands in great condition, more for new-with-tags or luxury items." },
      { question: "Which brands resell best?", answer: "Luxury designers, Lululemon, Patagonia, Arc'teryx, vintage denim and popular sneakers." },
    ],
  },
  {
    slug: "wedding-dress-resale-calculator",
    title: "Wedding Dress Resale Calculator",
    description: "Estimate what you can sell your wedding dress for — from original price, designer, age and condition — with a starting list price and consignment payout.",
    metaTitle: "Wedding Dress Resale Calculator — What Is It Worth?",
    metaDescription: "Free wedding dress resale calculator. Estimate what a wedding dress is worth from price, age, condition and designer, with trade-in and retail values.",
    calcInputs: [
      currencyField("originalPrice", "Original Price (Before Alterations)", { default: 1800, max: 10000000 }),
      numberField("ageYears", "Age", { unit: "years", default: 2, max: 30, step: 0.5 }),
      CONDITION(),
      dropdown("option", "Designer", [["Top designer (Vera Wang, Pnina Tornai, Monique Lhuillier)", 1.3], ["Mainstream bridal designer", 1], ["Off-the-rack (David's Bridal, etc.)", 0.7]], 1),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Consignment Payout", format: "currency" },
      { key: "dealerRetailValue", label: "Listing Price to Start At", format: "currency" },
      { key: "totalDepreciation", label: "Value Lost So Far", format: "currency" },
      { key: "percentRetained", label: "Value Retained (%)", format: "percentage" },
      { key: "averagePerYear", label: "Average Depreciation per Year", format: "currency" },
    ],
    instructions: "Enter the original price, the age in years and the condition, then choose the designer.\n\nCompare the result with recent sold listings for the same model near you — local demand can move prices either way.",
    examples: "Example: a wedding dress (mainstream bridal designer) bought for $1,800, 2 years old and in good condition is worth about $810.00 — 45.00% of its price — with a consignment payout near $486.00.",
    assumptions: "Worn wedding gowns typically resell for 30–60% of retail; never-worn or sample dresses sell higher. Professional cleaning adds value; heavy alterations (especially shortened hems) lower it. Styles from the last 2–3 years sell fastest. Condition: Excellent +10%, Fair −15%, Poor −35% versus Good.",
    faq: [
      { question: "How much can I sell my wedding dress for?", answer: "Usually 30–60% of the original price for designer gowns in excellent condition." },
      { question: "Where's the best place to sell a wedding dress?", answer: "Bridal resale sites and local bridal consignment shops reach buyers looking for designer gowns." },
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
