// One-time (but safe to re-run) batch setup script: creates the Maintenance & Repair tools
// (14) of the Car & Vehicle Cost Calculators expansion, filed under Car & Vehicle
// Cost Calculators > Car Maintenance, Repair & Upgrade Calculators (both categories are created on first run).
// See src/lib/calc-engine-car-repair.ts for the math and
// src/lib/calc-engine-car-buying.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-car-repair-calculators.ts
// or
//   npm run db:create-car-repair-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Car & Vehicle Cost Calculators", slug: "car-vehicle-cost-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Car Maintenance, Repair & Upgrade Calculators", slug: "car-maintenance-repair-upgrade-calculators" };

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
    slug: "car-maintenance-cost-calculator",
    title: "Car Maintenance Cost Calculator",
    description: "Estimate what routine car maintenance costs over the years — oil changes, tires, brakes, battery and other upkeep — per year and per mile.",
    metaTitle: "Car Maintenance Cost Calculator — Upkeep and Oil Changes",
    metaDescription: "Free car maintenance cost calculator. Estimate oil changes, tires, brakes and battery costs per year and per mile.",
    calcInputs: [
      numberField("milesPerYear", "Miles per Year", { default: 12000, min: 0, max: 100000, step: 500 }),
      numberField("years", "Years", { default: 5, min: 1, max: 20, step: 1 }),
      numberField("oilInterval", "Oil Change Interval (Miles)", { default: 7500, min: 500, max: 20000, step: 500 }),
      currencyField("oilChangeCost", "Oil Change Cost", { default: 80, max: 1000, step: 5 }),
      currencyField("tireSetCost", "Set of Tires (Installed)", { default: 800, max: 10000, step: 50 }),
      numberField("tireLifeMiles", "Tire Life (Miles)", { default: 50000, min: 1000, max: 120000, step: 5000 }),
      currencyField("brakeJobCost", "Brake Job Cost", { default: 400, max: 5000, step: 25 }),
      numberField("brakeLifeMiles", "Brake Life (Miles)", { default: 40000, min: 1000, max: 150000, step: 5000 }),
      currencyField("batteryCost", "Battery Replacement", { default: 200, max: 2000, step: 10 }),
      numberField("batteryLifeYears", "Battery Life (Years)", { default: 4, min: 1, max: 10, step: 1 }),
      currencyField("otherYearly", "Other Upkeep per Year (Filters, Wipers, Fluids, Inspections)", { default: 250, max: 10000, step: 25 }),
    ],
    calcResult: { label: "Total Maintenance Cost", format: "currency" },
    calcResults: [
      { key: "oilChanges", label: "Number of Oil Changes", format: "number" },
      { key: "oilChangeTotal", label: "Oil Changes", format: "currency" },
      { key: "tiresTotal", label: "Tires", format: "currency" },
      { key: "brakesTotal", label: "Brakes", format: "currency" },
      { key: "batteryTotal", label: "Battery", format: "currency" },
      { key: "otherTotal", label: "Other Upkeep", format: "currency" },
      { key: "totalMaintenance", label: "Total Maintenance Cost", format: "currency", highlight: true },
      { key: "costPerYear", label: "Cost per Year", format: "currency" },
      { key: "costPerMile", label: "Cost per Mile", format: "currency", decimals: 3 },
    ],
    instructions:
      "Routine maintenance follows mileage and time: oil changes every 5,000–10,000 miles with synthetic oil, tires " +
      "every 40,000–60,000, brake pads every 30,000–60,000, and a battery every 3–5 years. Costs are spread by how much " +
      "of each part's life you use.\n\n" +
      "Older cars add unplanned repairs on top; budgeting $50–$100 a month is a common rule of thumb.",
    examples:
      "Example: driving 12,000 miles a year for 5 years means about 8 oil changes ($640) and total " +
      "maintenance of $3,700 — $740 a year.",
    assumptions:
      "Parts costs spread pro rata by miles or years; unexpected repairs not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How often do I really need an oil change?",
        answer: "Follow your owner's manual — most modern cars on synthetic oil go 7,500–10,000 miles, or less with severe use.",
      },
    ],
  },
  {
    slug: "car-repair-cost-calculator",
    title: "Car Repair Cost Estimator",
    description: "Estimate a car repair bill — parts, labor hours at the shop's rate, shop fees and diagnosis — and what you'd pay if it's an accident repair through insurance or a free recall repair.",
    metaTitle: "Car Repair Cost Estimator — Parts, Labor & Accident Repair",
    metaDescription: "Free car repair cost estimator. Add parts, labor, shop fees and diagnosis, and see your share of an accident repair.",
    calcInputs: [
      currencyField("partsCost", "Parts Cost", { default: 450, max: 100000, step: 25 }),
      numberField("laborHours", "Labor Hours (Book Time)", { default: 3, min: 0, max: 100, step: 0.5 }),
      currencyField("laborRate", "Shop Labor Rate per Hour", { default: 140, max: 500, step: 5 }),
      percentField("shopFeesPercent", "Shop Supplies & Fees", { default: 5, max: 20, step: 1 }),
      percentField("salesTaxPercent", "Sales Tax on Parts", { default: 7, max: 15, step: 0.1 }),
      currencyField("diagnosticFee", "Diagnostic Fee", { default: 120, max: 1000, step: 10, required: false }),
      {
        key: "insuranceClaim", label: "Accident Repair Through Insurance?", type: "dropdown", required: true, default: 0,
        options: [
          { label: "No", value: 0 },
          { label: "Yes", value: 1 },
        ],
      },
      currencyField("deductible", "Insurance Deductible", { default: 500, max: 10000, step: 100 }),
    ],
    calcResult: { label: "Total Repair Cost", format: "currency" },
    calcResults: [
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "partsWithTax", label: "Parts (with Tax)", format: "currency" },
      { key: "shopFees", label: "Shop Fees", format: "currency" },
      { key: "totalRepairCost", label: "Total Repair Cost", format: "currency", highlight: true },
      { key: "insurancePays", label: "Insurance Pays", format: "currency" },
      { key: "youPay", label: "You Pay", format: "currency" },
    ],
    instructions:
      "Shops charge labor by \"book time\" — the standard hours for the job — times their hourly rate, typically $100–" +
      "$150 at independent shops and $150–$250 at dealers. Parts, shop supplies, tax and diagnosis are added.\n\n" +
      "Check for open safety recalls on your VIN at NHTSA.gov first: recall repairs are free at the dealer, as are " +
      "repairs covered by your warranty. For accident damage, your insurer pays the bill above your deductible.",
    examples:
      "Example: $450 of parts and 3 hours at $140 an hour comes to $1,065 with tax, shop fees and " +
      "diagnosis.",
    assumptions:
      "Labor not taxed; some states tax labor too. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I get a second opinion on a repair?",
        answer: "For anything over a few hundred dollars, yes — compare written estimates with the same parts and book time.",
      },
    ],
  },
  {
    slug: "mobile-mechanic-vs-dealership-calculator",
    title: "Mobile Mechanic vs Dealership Cost Calculator",
    description: "Compare the cost of a repair by a mobile mechanic at your home or work with the dealership's labor rate, parts markup and the time it costs you.",
    metaTitle: "Mobile Mechanic vs Dealership Cost Calculator",
    metaDescription: "Free calculator comparing a mobile mechanic with the dealership — labor rates, parts markup, trip fee and your time.",
    calcInputs: [
      numberField("laborHours", "Labor Hours", { default: 2, min: 0, max: 100, step: 0.5 }),
      currencyField("partsCost", "Parts Cost (Base Price)", { default: 300, max: 100000, step: 25 }),
      currencyField("dealerRate", "Dealership Labor Rate", { default: 180, max: 500, step: 5 }),
      percentField("dealerPartsMarkupPercent", "Dealership Parts Markup", { default: 30, max: 200, step: 5 }),
      currencyField("mobileRate", "Mobile Mechanic Labor Rate", { default: 110, max: 500, step: 5 }),
      percentField("mobilePartsMarkupPercent", "Mobile Mechanic Parts Markup", { default: 10, max: 200, step: 5 }),
      currencyField("mobileTripFee", "Mobile Mechanic Trip Fee", { default: 50, max: 500, step: 5 }),
      numberField("dealerTimeHours", "Your Time for a Dealer Visit (Hours)", { default: 3, min: 0, max: 24, step: 0.5 }),
      currencyField("hourlyValue", "Value of Your Time per Hour", { default: 30, max: 1000, step: 5 }),
    ],
    calcResult: { label: "Savings with a Mobile Mechanic", format: "currency" },
    calcResults: [
      { key: "dealershipTotal", label: "Dealership Total (incl. Your Time)", format: "currency" },
      { key: "mobileMechanicTotal", label: "Mobile Mechanic Total", format: "currency" },
      { key: "savingsWithMobileMechanic", label: "Savings with a Mobile Mechanic", format: "currency", highlight: true },
      { key: "savingsPercent", label: "Savings", format: "percentage" },
    ],
    instructions:
      "Mobile mechanics come to you and usually charge lower labor rates than dealerships, though they add a trip fee. " +
      "They're well suited to brakes, batteries, starters, alternators and routine service; jobs needing a lift, special " +
      "tools or dealer software are better done in a shop.\n\n" +
      "Dealerships use factory parts and handle warranty and recall work for free.",
    examples:
      "Example: a 2-hour job with $300 of parts costs $840 at the dealership including your time, versus " +
      "$600 with a mobile mechanic — $240 saved.",
    assumptions:
      "Same labor hours for both; your time valued at the hourly rate. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do mobile mechanics offer warranties?",
        answer: "Reputable ones warranty parts and labor, often 12 months or 12,000 miles — ask before booking.",
      },
    ],
  },
  {
    slug: "tire-replacement-cost-calculator",
    title: "Tire Replacement Cost Calculator",
    description: "Estimate the cost to replace your tires — including run-flat tires — with mounting, balancing, disposal and alignment, plus the cost per mile of tread life.",
    metaTitle: "Tire Replacement Cost Calculator — Run-Flat & Installation",
    metaDescription: "Free tire replacement cost calculator. Add tire prices, installation, disposal and alignment, including run-flat tires.",
    calcInputs: [
      currencyField("pricePerTire", "Price per Tire", { default: 180, max: 5000, step: 5 }),
      numberField("tires", "Number of Tires", { default: 4, min: 1, max: 6, step: 1 }),
      {
        key: "runFlat", label: "Run-Flat Tires?", type: "dropdown", required: true, default: 0,
        options: [
          { label: "No", value: 0 },
          { label: "Yes", value: 1 },
        ],
      },
      percentField("runFlatPremiumPercent", "Run-Flat Price Premium", { default: 40, max: 200, step: 5 }),
      currencyField("installPerTire", "Mounting & Balancing per Tire", { default: 25, max: 200, step: 1 }),
      currencyField("disposalPerTire", "Disposal Fee per Tire", { default: 4, max: 50, step: 1 }),
      currencyField("alignment", "Wheel Alignment", { default: 100, max: 1000, step: 5, required: false }),
      percentField("salesTaxPercent", "Sales Tax", { default: 7, max: 15, step: 0.1 }),
      numberField("treadLifeMiles", "Tread Life (Miles)", { default: 50000, min: 1000, max: 120000, step: 5000 }),
      numberField("milesPerYear", "Miles per Year", { default: 12000, min: 0, max: 100000, step: 500 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "tiresWithTax", label: "Tires (with Tax)", format: "currency" },
      { key: "installationAndDisposal", label: "Installation & Disposal", format: "currency" },
      { key: "totalCost", label: "Total Cost", format: "currency", highlight: true },
      { key: "runFlatExtra", label: "Extra for Run-Flats", format: "currency" },
      { key: "costPerMile", label: "Cost per Mile of Tread", format: "currency", decimals: 3 },
      { key: "yearsUntilNextSet", label: "Years Until the Next Set", format: "number" },
    ],
    instructions:
      "Tire quotes often leave out mounting, balancing, new valve stems, disposal fees and tax. An alignment is wise with " +
      "a new set. Run-flat tires let you drive about 50 miles after a puncture, but cost more, ride firmer and often " +
      "can't be repaired.\n\n" +
      "A cheaper tire with a short treadwear warranty can cost more per mile than a pricier long-life tire.",
    examples:
      "Example: 4 tires at $180 each cost $986.40 installed with alignment — about $0.02 a mile over " +
      "50,000 miles, or a new set every 4.17 years.",
    assumptions:
      "Tax on tires only. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When should I replace my tires?",
        answer: "At 2/32 inch of tread (the legal minimum in most states), and many experts suggest 4/32 for wet roads — or after about 6–10 years regardless of tread.",
      },
    ],
  },
  {
    slug: "car-battery-replacement-cost-calculator",
    title: "Car Battery Replacement Cost Calculator",
    description: "Estimate the cost to replace a 12-volt car battery — standard, EFB or AGM — with installation and any programming, and the cost per year of battery life.",
    metaTitle: "Car Battery Replacement Cost Calculator — AGM vs Standard",
    metaDescription: "Free car battery replacement calculator. Estimate standard, EFB or AGM battery cost with installation and programming.",
    calcInputs: [
      {
        key: "batteryType", label: "Battery Type", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Standard Flooded", value: 1 },
          { label: "EFB (Start-Stop)", value: 2 },
          { label: "AGM (Start-Stop, Premium)", value: 3 },
        ],
      },
      currencyField("quotedPrice", "Your Quoted Price (0 = Typical)", { default: 0, max: 2000, step: 5, required: false }),
      currencyField("installation", "Installation Fee", { default: 50, max: 500, step: 5, required: false }),
      currencyField("programming", "Battery Registration / Programming", { default: 0, max: 500, step: 5, required: false }),
      percentField("salesTaxPercent", "Sales Tax", { default: 7, max: 15, step: 0.1 }),
      numberField("lifeYears", "Expected Battery Life (Years)", { default: 4, min: 1, max: 10, step: 1 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "batteryPrice", label: "Battery Price", format: "currency" },
      { key: "totalCost", label: "Total Cost", format: "currency", highlight: true },
      { key: "costPerYear", label: "Cost per Year of Life", format: "currency" },
      { key: "savedByInstallingYourself", label: "Saved by Installing It Yourself", format: "currency" },
    ],
    instructions:
      "Most car batteries last 3–5 years, less in hot climates. Cars with start-stop systems need an EFB or AGM battery, " +
      "and many newer cars must have the new battery registered with the car's computer.\n\n" +
      "Many parts stores test batteries and install them free, and refund a core charge when you return the old one.",
    examples:
      "Example: a standard battery at $150 costs $210.50 with tax and installation — about $52.63 a year over its life.",
    assumptions:
      "Core charge refunded. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How do I know my battery is failing?",
        answer: "Slow cranking, dim lights, a warning light or a battery more than 4 years old — a free load test confirms it.",
      },
    ],
  },
  {
    slug: "windshield-replacement-cost-calculator",
    title: "Windshield Replacement Cost Calculator",
    description: "Estimate windshield replacement cost — aftermarket or OEM glass, installation and camera (ADAS) recalibration — what insurance covers, and the yearly cost of wiper blades.",
    metaTitle: "Windshield Replacement Cost Calculator — ADAS and Glass",
    metaDescription: "Free windshield replacement calculator. Estimate glass, installation and ADAS calibration cost and your share with insurance.",
    calcInputs: [
      currencyField("glassPrice", "Aftermarket Glass Price", { default: 350, max: 5000, step: 25 }),
      {
        key: "glassType", label: "Glass Type", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Aftermarket (OEE)", value: 1 },
          { label: "OEM (Original)", value: 2 },
        ],
      },
      currencyField("installLabor", "Installation Labor", { default: 150, max: 2000, step: 10 }),
      currencyField("adasCalibration", "Camera / ADAS Recalibration", { default: 250, max: 2000, step: 25, required: false }),
      {
        key: "fullGlassCoverage", label: "Full Glass Coverage ($0 Deductible)?", type: "dropdown", required: true, default: 0,
        options: [
          { label: "No", value: 0 },
          { label: "Yes", value: 1 },
        ],
      },
      currencyField("deductible", "Comprehensive Deductible", { default: 500, max: 5000, step: 100 }),
      currencyField("wiperPairPrice", "Wiper Blades (Pair)", { default: 40, max: 500, step: 5 }),
      numberField("wiperChangesPerYear", "Wiper Changes per Year", { default: 2, min: 0, max: 6, step: 1 }),
    ],
    calcResult: { label: "Replacement Cost", format: "currency" },
    calcResults: [
      { key: "replacementCost", label: "Replacement Cost", format: "currency", highlight: true },
      { key: "youPayWithInsurance", label: "You Pay with Insurance", format: "currency" },
      { key: "insurancePays", label: "Insurance Pays", format: "currency" },
      { key: "wiperBladesPerYear", label: "Wiper Blades per Year", format: "currency" },
    ],
    instructions:
      "Windshields on cars with lane-keeping or automatic emergency braking cameras need recalibration after replacement, " +
      "which can add $150–$400. OEM glass costs more than aftermarket. Small chips can often be repaired for much less — " +
      "and many insurers repair chips for free.\n\n" +
      "Comprehensive coverage pays for glass after your deductible; some policies and states offer full glass coverage with no deductible.",
    examples:
      "Example: replacing an aftermarket windshield with recalibration costs $750. With a $500 deductible you'd pay " +
      "$500 and insurance $250.",
    assumptions:
      "OEM glass priced at 1.6 times aftermarket. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does a windshield claim raise my insurance?",
        answer: "Glass claims under comprehensive usually don't, but several claims in a short time can affect renewal.",
      },
    ],
  },
  {
    slug: "car-key-replacement-cost-calculator",
    title: "Car Key Replacement Cost Calculator",
    description: "Estimate the cost to replace a car key or key fob — basic, transponder, remote or smart key — from a dealer, locksmith or online, including when all keys are lost.",
    metaTitle: "Car Key Replacement Cost Calculator — Key Fob Cost",
    metaDescription: "Free car key replacement calculator. Compare dealer, locksmith and DIY prices for transponder keys, fobs and smart keys.",
    calcInputs: [
      {
        key: "keyType", label: "Key Type", type: "dropdown", required: true, default: 3,
        options: [
          { label: "Basic Metal Key", value: 1 },
          { label: "Transponder (Chip) Key", value: 2 },
          { label: "Remote Key / Switchblade Fob", value: 3 },
          { label: "Smart Key (Push-Button Start)", value: 4 },
        ],
      },
      {
        key: "source", label: "Where You Get It", type: "dropdown", required: true, default: 2,
        options: [
          { label: "Dealership", value: 1 },
          { label: "Automotive Locksmith", value: 2 },
          { label: "Online Key + Programming", value: 3 },
        ],
      },
      {
        key: "allKeysLost", label: "All Keys Lost?", type: "dropdown", required: true, default: 0,
        options: [
          { label: "No — I Have a Working Key", value: 0 },
          { label: "Yes", value: 1 },
        ],
      },
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "keyCost", label: "Key & Programming", format: "currency" },
      { key: "extraForAllKeysLost", label: "Extra When All Keys Are Lost", format: "currency" },
      { key: "totalCost", label: "Total Cost", format: "currency", highlight: true },
      { key: "dealerPrice", label: "Dealership Price", format: "currency" },
      { key: "savingsVsDealer", label: "Savings vs Dealership", format: "currency" },
    ],
    instructions:
      "Modern keys contain a chip that must be programmed to your car, so replacements cost far more than a cut metal " +
      "key. Automotive locksmiths are often 20–40% cheaper than dealers and come to you. Losing every key costs more " +
      "because the car's system must be reset.\n\n" +
      "Getting a spare made while you still have a working key is the cheapest insurance against a lockout or tow. " +
      "Some insurance policies and roadside plans cover key replacement.",
    examples:
      "Example: a remote key from a locksmith costs about $175, versus $250 at the dealership — $75 saved.",
    assumptions:
      "Typical prices: basic $15, transponder $150, remote $250, smart key $400 at a dealer. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I program a key fob myself?",
        answer: "Some older cars allow onboard programming; most newer ones need a dealer or locksmith tool.",
      },
    ],
  },
  {
    slug: "catalytic-converter-replacement-cost-calculator",
    title: "Catalytic Converter Replacement Cost Calculator",
    description: "Estimate catalytic converter replacement cost — aftermarket, CARB-compliant or OEM — with labor, and what you'd pay if it was stolen and you have comprehensive coverage.",
    metaTitle: "Catalytic Converter Replacement Cost Calculator",
    metaDescription: "Free catalytic converter replacement calculator. Estimate part and labor cost and your share after a theft claim.",
    calcInputs: [
      {
        key: "converterType", label: "Converter Type", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Aftermarket (EPA)", value: 1 },
          { label: "CARB-Compliant (California & Similar States)", value: 2 },
          { label: "OEM (Original)", value: 3 },
        ],
      },
      currencyField("quotedPartPrice", "Your Quoted Part Price (0 = Typical)", { default: 0, max: 10000, step: 25, required: false }),
      numberField("laborHours", "Labor Hours", { default: 1.5, min: 0, max: 20, step: 0.5 }),
      currencyField("laborRate", "Labor Rate per Hour", { default: 130, max: 500, step: 5 }),
      currencyField("extraParts", "Extra Parts (O2 Sensors, Pipes, Gaskets)", { default: 0, max: 5000, step: 25, required: false }),
      {
        key: "theftClaim", label: "Stolen & Claiming on Comprehensive?", type: "dropdown", required: true, default: 0,
        options: [
          { label: "No", value: 0 },
          { label: "Yes", value: 1 },
        ],
      },
      currencyField("deductible", "Comprehensive Deductible", { default: 500, max: 5000, step: 100 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "partCost", label: "Converter", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "totalCost", label: "Total Cost", format: "currency", highlight: true },
      { key: "youPay", label: "You Pay", format: "currency" },
      { key: "insurancePays", label: "Insurance Pays", format: "currency" },
    ],
    instructions:
      "Catalytic converters contain precious metals, which makes them expensive to replace and a target for theft — " +
      "especially on hybrids, trucks and SUVs. California and some other states require CARB-approved converters, which " +
      "cost more than standard aftermarket ones.\n\n" +
      "Theft is covered by comprehensive insurance, not liability-only policies. Anti-theft shields and engraving your " +
      "VIN on the converter can deter thieves.",
    examples:
      "Example: an aftermarket converter at $600 plus $195 of labor costs $795.",
    assumptions:
      "Typical part prices: aftermarket $600, CARB $1,200, OEM $2,000. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What are the signs of a failing catalytic converter?",
        answer: "A check-engine light (often code P0420), a rotten-egg smell, sluggish acceleration or a failed emissions test.",
      },
    ],
  },
  {
    slug: "timing-belt-replacement-cost-calculator",
    title: "Timing Belt Replacement Cost Calculator",
    description: "Estimate timing belt replacement cost with the water pump, the cost per mile between replacements, and what a broken belt could cost on an interference engine.",
    metaTitle: "Timing Belt Replacement Cost Calculator — With Water Pump",
    metaDescription: "Free timing belt replacement calculator. Estimate kit, water pump and labor cost and the risk of skipping it.",
    calcInputs: [
      currencyField("kitPrice", "Timing Belt Kit (Belt, Tensioner, Idlers)", { default: 250, max: 5000, step: 10 }),
      currencyField("waterPumpPrice", "Water Pump (Replace Together)", { default: 100, max: 2000, step: 10, required: false }),
      numberField("laborHours", "Labor Hours", { default: 4, min: 0, max: 20, step: 0.5 }),
      currencyField("laborRate", "Labor Rate per Hour", { default: 130, max: 500, step: 5 }),
      numberField("intervalMiles", "Replacement Interval (Miles)", { default: 100000, min: 1000, max: 200000, step: 5000 }),
      numberField("milesPerYear", "Miles per Year", { default: 12000, min: 0, max: 100000, step: 500 }),
      {
        key: "interference", label: "Interference Engine?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes — Belt Failure Damages the Engine", value: 1 },
          { label: "No", value: 0 },
        ],
      },
      currencyField("engineDamageCost", "Engine Damage Cost If It Breaks", { default: 4000, max: 50000, step: 250 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "totalCost", label: "Total Cost", format: "currency", highlight: true },
      { key: "costPerMile", label: "Cost per Mile", format: "currency", decimals: 3 },
      { key: "yearsBetweenReplacements", label: "Years Between Replacements", format: "number" },
      { key: "costIfBeltBreaks", label: "Cost If the Belt Breaks First", format: "currency" },
    ],
    instructions:
      "Timing belts are replaced on a schedule — typically every 60,000–105,000 miles or 7–10 years — because they can " +
      "snap without warning. In an interference engine, a broken belt lets the valves hit the pistons, often ruining " +
      "the engine. Most of the cost is labor, so replacing the water pump and tensioners at the same time is usually wise.\n\n" +
      "Many engines use a timing chain instead, which usually lasts the life of the engine.",
    examples:
      "Example: a timing belt job with the water pump costs about $870 — every 8.33 years at 12,000 miles a year. " +
      "If the belt breaks on an interference engine, the bill could reach $4,870.",
    assumptions:
      "Non-interference failure assumed to add about $200 of towing and diagnosis. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does my car have a timing belt or chain?",
        answer: "Check your owner's manual or maintenance schedule — if it lists a timing belt replacement interval, it has a belt.",
      },
    ],
  },
  {
    slug: "transmission-repair-cost-calculator",
    title: "Transmission Repair Cost Calculator",
    description: "Estimate transmission repair cost — fluid service, minor repair, rebuild, used or remanufactured replacement — and whether the repair is worth it for your car's value.",
    metaTitle: "Transmission Repair Cost Calculator — Is It Worth Fixing",
    metaDescription: "Free transmission repair cost calculator. Estimate rebuild or replacement cost and whether it's worth it for your car.",
    calcInputs: [
      {
        key: "repairType", label: "Repair Type", type: "dropdown", required: true, default: 3,
        options: [
          { label: "Fluid & Filter Service", value: 1 },
          { label: "Minor Repair (Solenoid, Seal, Sensor)", value: 2 },
          { label: "Rebuild", value: 3 },
          { label: "Used Transmission Installed", value: 4 },
          { label: "Remanufactured Transmission Installed", value: 5 },
        ],
      },
      currencyField("quote", "Your Quote (0 = Typical)", { default: 0, max: 50000, step: 50, required: false }),
      currencyField("valueIfRunning", "Car Value If Repaired", { default: 9000, max: 1000000, step: 250 }),
      currencyField("valueAsIs", "Car Value As-Is (Not Running)", { default: 3000, max: 1000000, step: 250 }),
    ],
    calcResult: { label: "Net Gain from Repairing", format: "currency" },
    calcResults: [
      { key: "repairCost", label: "Repair Cost", format: "currency" },
      { key: "repairAsShareOfValue", label: "Repair as % of Car Value", format: "percentage" },
      { key: "valueAddedByRepair", label: "Value Added by the Repair", format: "currency" },
      { key: "netGainFromRepair", label: "Net Gain from Repairing", format: "currency", highlight: true },
    ],
    instructions:
      "Transmission problems range from a fluid service to a full rebuild or replacement costing several thousand " +
      "dollars. Whether it's worth fixing depends on how much more the car is worth running than broken — and on the rest " +
      "of the car's condition.\n\n" +
      "Get a proper diagnosis first; some shifting problems are fixed by software updates or sensors. A negative net " +
      "gain means selling as-is may be better.",
    examples:
      "Example: a $3,500 rebuild on a car worth $9,000 running and $3,000 as-is adds $6,000 of value " +
      "— a net gain of $2,500.",
    assumptions:
      "Typical costs: service $200, minor $600, rebuild $3,500, used $2,500, remanufactured $4,500. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Rebuilt or remanufactured — which is better?",
        answer: "Remanufactured units are rebuilt in a factory to updated specs and usually carry longer warranties; local rebuilds can be cheaper.",
      },
    ],
  },
  {
    slug: "brake-job-cost-calculator",
    title: "Brake Job Cost Calculator",
    description: "Estimate the cost of a brake job — pads, rotors and labor for the front, rear or both axles — and compare it with a pads-only job.",
    metaTitle: "Brake Job Cost Calculator — Pads & Rotors",
    metaDescription: "Free brake job cost calculator. Estimate pads, rotors and labor for front, rear or all four wheels.",
    calcInputs: [
      {
        key: "axles", label: "Which Brakes", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Front", value: 1 },
          { label: "Rear", value: 2 },
          { label: "Front and Rear", value: 3 },
        ],
      },
      currencyField("padsPerAxle", "Brake Pads per Axle", { default: 80, max: 1000, step: 5 }),
      {
        key: "replaceRotors", label: "Replace Rotors?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes", value: 1 },
          { label: "No — Pads Only", value: 0 },
        ],
      },
      currencyField("rotorsPerAxle", "Rotors per Axle (Pair)", { default: 160, max: 3000, step: 10 }),
      numberField("laborHoursPerAxle", "Labor Hours per Axle", { default: 1.5, min: 0, max: 10, step: 0.5 }),
      currencyField("laborRate", "Labor Rate per Hour", { default: 120, max: 500, step: 5 }),
      currencyField("fluidFlush", "Brake Fluid Flush", { default: 0, max: 500, step: 10, required: false }),
      percentField("salesTaxPercent", "Sales Tax on Parts", { default: 7, max: 15, step: 0.1 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "partsCost", label: "Parts", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "totalCost", label: "Total Cost", format: "currency", highlight: true },
      { key: "padsOnlyCost", label: "Pads-Only Cost", format: "currency" },
    ],
    instructions:
      "Brake pads usually last 30,000–70,000 miles; rotors often need replacing every second pad change, or sooner if " +
      "warped or worn below minimum thickness. Front brakes wear faster than rears.\n\n" +
      "Squealing, grinding, a pulsing pedal or longer stopping distances mean it's time for an inspection.",
    examples:
      "Example: front pads and rotors cost $240 in parts plus $180 of labor — $436.80 in total, versus " +
      "$265.60 for pads only.",
    assumptions:
      "Tax on parts only. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I replace just the pads?",
        answer: "If the rotors are smooth and above minimum thickness, yes — otherwise new pads on worn rotors brake poorly and wear fast.",
      },
    ],
  },
  {
    slug: "car-ac-repair-cost-calculator",
    title: "Car AC Repair Cost Calculator",
    description: "Estimate car air conditioning repair cost — recharge, leak repair, condenser, compressor or evaporator — for R-134a or newer R-1234yf systems.",
    metaTitle: "Car AC Repair Cost Calculator — Recharge to Compressor",
    metaDescription: "Free car AC repair calculator. Estimate recharge, leak repair, condenser or compressor cost for R-134a and R-1234yf.",
    calcInputs: [
      {
        key: "repairType", label: "Repair Needed", type: "dropdown", required: true, default: 2,
        options: [
          { label: "Recharge Only", value: 1 },
          { label: "Leak Repair + Recharge", value: 2 },
          { label: "Condenser Replacement", value: 3 },
          { label: "Compressor Replacement", value: 4 },
          { label: "Evaporator Replacement", value: 5 },
        ],
      },
      {
        key: "refrigerant", label: "Refrigerant", type: "dropdown", required: true, default: 1,
        options: [
          { label: "R-134a (Most Cars Before ~2015)", value: 1 },
          { label: "R-1234yf (Most Newer Cars)", value: 2 },
        ],
      },
      currencyField("quote", "Repair Quote Excluding Recharge (0 = Typical)", { default: 0, max: 10000, step: 25, required: false }),
      currencyField("diagnosticFee", "Diagnostic / Leak Test Fee", { default: 100, max: 500, step: 10, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "repairCost", label: "Repair", format: "currency" },
      { key: "rechargeCost", label: "Evacuate & Recharge", format: "currency" },
      { key: "diagnosticFee", label: "Diagnosis", format: "currency" },
      { key: "totalCost", label: "Total Cost", format: "currency", highlight: true },
    ],
    instructions:
      "Car AC systems are sealed, so low refrigerant means a leak — a recharge alone may only last weeks. Newer cars use " +
      "R-1234yf refrigerant, which costs several times more than older R-134a.\n\n" +
      "A compressor that has failed internally can contaminate the system, so shops often replace other parts with it.",
    examples:
      "Example: a leak repair on an R-134a system costs about $500, including a $150 recharge and diagnosis.",
    assumptions:
      "Typical repair costs excluding recharge: leak $250, condenser $650, compressor $1,300, evaporator $1,600. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are DIY AC recharge kits safe?",
        answer: "They can top up R-134a systems but can overcharge or hide leaks; they're not suitable for R-1234yf systems.",
      },
    ],
  },
  {
    slug: "car-towing-cost-calculator",
    title: "Car Towing Cost Calculator",
    description: "Estimate the cost of a tow — hook-up fee, per-mile charge, larger vehicles, after-hours surcharges and extras like winching.",
    metaTitle: "Car Towing Cost Calculator — Tow Truck Cost Estimate",
    metaDescription: "Free car towing cost calculator. Estimate hook-up, per-mile, after-hours and winching charges for a tow.",
    calcInputs: [
      currencyField("hookupFee", "Hook-Up Fee", { default: 75, max: 1000, step: 5 }),
      currencyField("perMile", "Charge per Mile", { default: 4, max: 50, step: 0.25 }),
      numberField("miles", "Tow Distance (Miles)", { default: 15, min: 0, max: 1000, step: 1 }),
      numberField("freeMiles", "Miles Included Free", { default: 0, min: 0, max: 200, step: 1, required: false }),
      {
        key: "vehicle", label: "Vehicle", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Car", value: 1 },
          { label: "SUV, Pickup or Van", value: 2 },
        ],
      },
      percentField("afterHoursPercent", "Night / Weekend / Holiday Surcharge", { default: 0, max: 100, step: 5, required: false }),
      currencyField("extras", "Extras (Winching, Dollies, Storage)", { default: 0, max: 5000, step: 25, required: false }),
    ],
    calcResult: { label: "Total Tow Cost", format: "currency" },
    calcResults: [
      { key: "mileageCharge", label: "Mileage Charge", format: "currency" },
      { key: "totalTowCost", label: "Total Tow Cost", format: "currency", highlight: true },
      { key: "costPerMile", label: "Cost per Mile", format: "currency" },
    ],
    instructions:
      "Tow companies charge a hook-up fee plus a per-mile rate, more for larger vehicles, nights and holidays, and extra " +
      "for winching a car out of a ditch. If the car goes to the tow yard, daily storage fees add up quickly.\n\n" +
      "Check your roadside assistance plan, auto policy or credit card first — many include several free tow miles.",
    examples:
      "Example: a 15-mile tow with a $75 hook-up fee and $4 a mile costs about $135.",
    assumptions:
      "Per-mile charge applies after any free miles. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does car insurance cover towing?",
        answer: "Only if you have towing/roadside coverage on your policy, or as part of a covered accident claim.",
      },
    ],
  },
  {
    slug: "roadside-assistance-plan-calculator",
    title: "Roadside Assistance Plan Calculator",
    description: "Decide whether a roadside assistance plan is worth it by comparing its yearly price with what you'd expect to pay for tows, jump-starts, lockouts and flat tires.",
    metaTitle: "Roadside Assistance Plan Calculator — Is It Worth It",
    metaDescription: "Free roadside assistance calculator. Compare a plan's yearly price with the expected cost of tows, lockouts and jump-starts.",
    calcInputs: [
      currencyField("planYearlyCost", "Plan Price per Year", { default: 120, max: 1000, step: 5 }),
      numberField("towsPerYear", "Expected Tows per Year", { default: 0.5, min: 0, max: 10, step: 0.1 }),
      currencyField("towCost", "Cost of a Tow", { default: 135, max: 2000, step: 5 }),
      numberField("otherCallsPerYear", "Expected Jump-Starts, Lockouts & Flats per Year", { default: 0.8, min: 0, max: 20, step: 0.1 }),
      currencyField("otherCallCost", "Cost of a Service Call", { default: 75, max: 1000, step: 5 }),
    ],
    calcResult: { label: "Expected Savings with a Plan", format: "currency" },
    calcResults: [
      { key: "expectedPayPerUseCost", label: "Expected Pay-Per-Use Cost", format: "currency" },
      { key: "planCost", label: "Plan Cost", format: "currency" },
      { key: "expectedSavingsWithPlan", label: "Expected Savings with a Plan", format: "currency", highlight: true },
      { key: "breakEvenCallsPerYear", label: "Service Calls per Year to Break Even", format: "number" },
    ],
    instructions:
      "Roadside plans range from cheap add-ons to your auto policy (often $15–$40 a year) to club memberships with long " +
      "free tows and travel perks. Many new-car warranties and some credit cards already include roadside help.\n\n" +
      "Plans are worth more for older cars, long commutes and road trips. A negative savings figure means paying per use " +
      "is likely cheaper — though a plan also buys peace of mind.",
    examples:
      "Example: expecting 0.50 tows and 0.80 other calls a year, paying per use would cost about $127.50 " +
      "versus a $120 plan — $7.50 saved on average.",
    assumptions:
      "Average yearly usage; plan limits on tow miles and calls not checked. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does my car insurance already include roadside assistance?",
        answer: "Only if you added it — check your declarations page for towing or roadside coverage.",
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
