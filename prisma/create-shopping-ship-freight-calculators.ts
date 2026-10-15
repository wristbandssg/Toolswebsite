// One-time (but safe to re-run) batch setup script: creates 7 freight and container tools
// from the user's shopping list (Shopping Calculators > Shipping & Moving Cost Calculators).
// See src/lib/calc-engine-shopping-ship-freight.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-ship-freight-calculators.ts
// or
//   npm run db:create-shopping-ship-freight-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Shipping & Moving Cost Calculators", slug: "shipping-moving-cost-calculators" };

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

const CONTAINER = (def: number) => dropdown("container", "Container", [["20 ft standard", 0], ["40 ft standard", 1], ["40 ft high cube", 2]], def);

const TOOLS: ToolDef[] = [
  {
    slug: "freight-class-calculator",
    title: "Freight Class Calculator",
    description: "Find the NMFC freight class (50–500) of an LTL shipment from its density — pallet or crate dimensions and weight — so you can get accurate freight quotes.",
    metaTitle: "Freight Class Calculator — NMFC Density Class",
    metaDescription: "Free freight class calculator. Find the NMFC freight class and density (lb per cu ft) of a pallet or crate from its size and weight.",
    calcInputs: [
      numberField("length", "Length (Including Pallet)", { unit: "in", default: 48, max: 600, step: 1 }),
      numberField("width", "Width", { unit: "in", default: 40, max: 120, step: 1 }),
      numberField("height", "Height (Including Pallet)", { unit: "in", default: 48, max: 120, step: 1 }),
      numberField("weightLb", "Weight per Piece (Including Pallet)", { unit: "lb", default: 600, max: 20000, step: 1 }),
      numberField("pieces", "Number of Identical Pieces", { default: 1, min: 1, max: 100 }),
    ],
    calcResult: { label: "Freight Class", format: "number" },
    calcResults: [
      { key: "freightClass", label: "Estimated Freight Class", format: "number", highlight: true },
      { key: "densityPcf", label: "Density (lb per cu ft)", format: "number" },
      { key: "totalCubicFeet", label: "Total Volume (cu ft)", format: "number" },
      { key: "totalWeightLb", label: "Total Weight (lb)", format: "number" },
    ],
    instructions: "Measure the shipment as it will travel — on its pallet or in its crate, at the widest points — and weigh it including packaging. Enter one piece and how many identical pieces there are.",
    examples: "Example: a 48 × 40 × 48 in pallet weighing 600 lb has a density of 11.25 lb/cu ft, which is freight class 92.5.",
    assumptions: "Density = weight ÷ (L × W × H ÷ 1,728). Classes follow the 2025 NMFC density scale (50 for 50+ lb/cu ft up to 500 for under 1 lb/cu ft). Some commodities are classed by handling, stowability or liability rather than density — check the NMFC item for your goods.",
    faq: [
      { question: "How is freight class determined?", answer: "Mostly by density (pounds per cubic foot): denser freight gets a lower class and a lower rate per pound." },
      { question: "What freight class is a standard pallet?", answer: "It depends on weight: a 48 × 40 × 48 in pallet is class 92.5 at 600 lb, class 70 at about 900 lb and class 125 at about 400 lb." },
    ],
  },
  {
    slug: "freight-shipping-cost-calculator",
    title: "Freight Shipping Cost Calculator",
    description: "Estimate LTL freight shipping cost from weight, freight class and distance — with your carrier discount, minimum charge, fuel surcharge and accessorial fees like liftgate.",
    metaTitle: "Freight Shipping Cost Calculator — LTL Estimate",
    metaDescription: "Free freight shipping cost calculator. Estimate LTL freight cost by weight, class and distance with discount, fuel surcharge and liftgate fees.",
    calcInputs: [
      numberField("weightLb", "Shipment Weight", { unit: "lb", default: 1000, max: 20000, step: 1 }),
      numberField("freightClass", "Freight Class", { default: 70, min: 50, max: 500, step: 2.5 }),
      numberField("distanceMiles", "Distance", { unit: "miles", default: 800, max: 3500, step: 1 }),
      percentField("discount", "Carrier / Broker Discount", { default: 50, max: 90 }),
      currencyField("minimumCharge", "Minimum Charge", { default: 150, max: 1000 }),
      percentField("fuelSurcharge", "Fuel Surcharge", { default: 30, max: 60 }),
      currencyField("accessorials", "Accessorial Fees (Liftgate, Residential, etc.)", { default: 0, max: 2000, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Freight Cost", format: "currency", highlight: true },
      { key: "lineHaul", label: "Line Haul After Discount", format: "currency" },
      { key: "fuelSurchargeCost", label: "Fuel Surcharge", format: "currency" },
      { key: "costPerLb", label: "Cost per Pound", format: "currency" },
      { key: "costPerMile", label: "Cost per Mile", format: "currency" },
    ],
    instructions: "Enter the weight, freight class (use the Freight Class Calculator) and distance. LTL tariffs are quoted with big discounts — 50–80% is common through brokers. Add accessorials: liftgate about $75–$150, residential about $100–$150, inside delivery $100+.",
    examples: "Example: 1,000 lb of class 70 freight moving 800 miles with a 50% discount and 30% fuel surcharge costs about $364.80 ($0.36 per lb).",
    assumptions: "Base tariff per 100 lb rises with distance and class (each class step costs more per pound); the discount applies to the tariff, then the minimum charge, then fuel. A planning estimate — real quotes depend on lanes, pickup and delivery locations and carrier capacity.",
    faq: [
      { question: "How much does LTL freight cost?", answer: "Commonly $150–$800 for one or two pallets moving regionally, and more for long-haul, low-density or residential deliveries." },
      { question: "What are accessorial charges?", answer: "Extra services beyond dock-to-dock — liftgates, residential delivery, appointments, inside delivery and limited-access sites." },
    ],
  },
  {
    slug: "pallet-shipping-cost-calculator",
    title: "Pallet Shipping Cost Calculator",
    description: "Estimate what it costs to ship one or more pallets by LTL freight — by pallet weight, distance and service — and whether a full truckload would be cheaper.",
    metaTitle: "Pallet Shipping Cost Calculator — LTL vs FTL",
    metaDescription: "Free pallet shipping cost calculator. Estimate the cost per pallet by weight and distance and compare LTL with a full truckload.",
    calcInputs: [
      numberField("pallets", "Number of Pallets", { default: 2, min: 1, max: 30 }),
      numberField("weightPerPalletLb", "Weight per Pallet", { unit: "lb", default: 800, max: 4000, step: 10 }),
      numberField("distanceMiles", "Distance", { unit: "miles", default: 600, max: 3500, step: 1 }),
      dropdown("service", "Service", [["Standard LTL", 0], ["Guaranteed / expedited", 1], ["White glove", 2]], 0),
      currencyField("accessorials", "Liftgate / Residential Fees", { default: 0, max: 2000, required: false }),
      currencyField("truckRatePerMile", "Full Truckload Rate per Mile", { default: 2.5, max: 10, step: 0.05 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated LTL Cost", format: "currency", highlight: true },
      { key: "costPerPallet", label: "Cost per Pallet", format: "currency" },
      { key: "fullTruckloadEstimate", label: "Full Truckload Estimate", format: "currency" },
      { key: "cheaperOption", label: "Cheaper Option (1 = LTL, 2 = Full Truck)", format: "number" },
      { key: "totalWeightLb", label: "Total Weight (lb)", format: "number" },
    ],
    instructions: "Enter how many standard 48 × 40 in pallets, the weight of each, the distance and service. Update the truckload rate per mile for your lane — dry-van spot rates are often $2–$3 per mile.",
    examples: "Example: two 800 lb pallets going 600 miles by standard LTL cost about $569.44 ($284.72 each) versus about $1,500.00 for a whole truck.",
    assumptions: "LTL estimate per pallet rises with distance and weight; expedited and white-glove services cost more. A full 53 ft truck holds 26 floor-loaded pallets; once you fill about 8–12 pallets or 10,000+ lb, partial or full truckload is often cheaper. 2026 planning estimates.",
    faq: [
      { question: "How much does it cost to ship a pallet?", answer: "Typically $150–$500 regionally and $400–$1,000+ cross-country, depending on weight, class and services." },
      { question: "When should I use a full truckload?", answer: "When you have roughly 10 or more pallets, very heavy freight or fragile goods that shouldn't be re-handled." },
    ],
  },
  {
    slug: "air-freight-cost-calculator",
    title: "Air Freight Cost Calculator",
    description: "Estimate air freight cost from carton weight and dimensions — chargeable weight (volumetric ÷ 6,000), rate per kg, fuel and security surcharges and fixed fees.",
    metaTitle: "Air Freight Cost Calculator — Chargeable Weight",
    metaDescription: "Free air freight cost calculator. Find chargeable weight (actual vs volumetric ÷ 6000) and total air cargo cost with surcharges and fees.",
    calcInputs: [
      numberField("pieces", "Number of Cartons", { default: 10, min: 1, max: 10000 }),
      numberField("weightKgPerPiece", "Weight per Carton", { unit: "kg", default: 12, max: 1000, step: 0.1 }),
      numberField("lengthCm", "Carton Length", { unit: "cm", default: 60, max: 300, step: 1 }),
      numberField("widthCm", "Carton Width", { unit: "cm", default: 40, max: 300, step: 1 }),
      numberField("heightCm", "Carton Height", { unit: "cm", default: 40, max: 300, step: 1 }),
      currencyField("ratePerKg", "Air Rate per kg", { default: 4.5, max: 30, step: 0.05 }),
      currencyField("surchargePerKg", "Fuel & Security Surcharge per kg", { default: 1, max: 10, step: 0.05 }),
      currencyField("fixedFees", "Fixed Fees (Docs, Handling, Pickup)", { default: 150, max: 5000, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Air Freight Cost", format: "currency", highlight: true },
      { key: "chargeableKg", label: "Chargeable Weight (kg)", format: "number" },
      { key: "volumetricKg", label: "Volumetric Weight (kg)", format: "number" },
      { key: "actualKg", label: "Actual Weight (kg)", format: "number" },
      { key: "costPerKg", label: "All-In Cost per Chargeable kg", format: "currency" },
    ],
    instructions: "Enter the number of identical cartons, the weight and outer dimensions of one, and your forwarder's rate and surcharges per kg (quotes from Asia to the US or Europe are often $3–$7/kg all-in).",
    examples: "Example: ten 60 × 40 × 40 cm cartons at 12 kg each have a volumetric weight of 160 kg, so you pay for 160 kg — about $1,030.00 in total.",
    assumptions: "Volumetric weight = L × W × H (cm) ÷ 6,000 per carton (1 m³ = 167 kg). Chargeable weight is the greater of actual and volumetric, in half-kilo steps. Rates fall at weight breaks (+45, +100, +300, +500 kg) and change with season and fuel.",
    faq: [
      { question: "How is air freight cost calculated?", answer: "Chargeable weight (actual or volumetric, whichever is higher) × rate per kg, plus fuel and security surcharges and handling fees." },
      { question: "When is air freight worth it over sea?", answer: "For urgent, high-value or small shipments where days matter more than cost — air is often 4–6× the price of sea freight." },
    ],
  },
  {
    slug: "container-shipping-cost-calculator",
    title: "Container Shipping Cost Calculator",
    description: "Estimate the full cost of shipping a 20 ft or 40 ft ocean container — freight, origin and destination charges, trucking, customs broker and duty — to a landed cost per unit.",
    metaTitle: "Container Shipping Cost Calculator — 20 ft & 40 ft",
    metaDescription: "Free container shipping cost calculator. Add ocean freight, port charges, drayage, broker and duty for 20 ft or 40 ft containers.",
    calcInputs: [
      CONTAINER(1),
      numberField("containers", "Number of Containers", { default: 1, min: 1, max: 100 }),
      currencyField("oceanFreight", "Ocean Freight per Container", { default: 2800, max: 30000 }),
      currencyField("originCharges", "Origin Charges per Container", { default: 450, max: 5000 }),
      currencyField("destinationCharges", "Destination Port Charges per Container", { default: 750, max: 5000 }),
      currencyField("drayage", "Trucking (Drayage) per Container", { default: 650, max: 5000 }),
      currencyField("customsBroker", "Customs Broker & Bond", { default: 250, max: 5000, required: false }),
      currencyField("goodsValue", "Goods Value", { default: 60000, max: 100000000 }),
      percentField("dutyRate", "Duty + Tariff Rate", { default: 5, max: 200, required: false }),
      numberField("units", "Units in the Shipment", { default: 3000, max: 10000000, required: false }),
    ],
    calcResult: { label: "Shipping Cost", format: "currency" },
    calcResults: [
      { key: "totalShippingCost", label: "Total Shipping Cost", format: "currency", highlight: true },
      { key: "dutyCost", label: "Duties & Tariffs", format: "currency" },
      { key: "landedCost", label: "Landed Cost (Goods + Shipping + Duty)", format: "currency" },
      { key: "costPerCbm", label: "Shipping Cost per m³ (85% Loaded)", format: "currency" },
      { key: "shippingCostPerUnit", label: "Shipping + Duty per Unit", format: "currency" },
    ],
    instructions: "Pick the container, then enter your forwarder's quote line by line — ocean freight, origin charges (THC, docs, loading), destination port charges and trucking to your warehouse — plus customs broker, goods value and duty rate.",
    examples: "Example: one 40 ft container with $2,800 ocean freight and typical port, trucking and broker charges costs $4,900.00 to move, plus $3,000.00 duty on $60,000 of goods — $2.63 per unit for 3,000 units.",
    assumptions: "Usable volume: 20 ft ≈ 33 m³, 40 ft ≈ 67 m³, 40 ft HC ≈ 76 m³; per-m³ cost assumes 85% loading. Ocean rates swing widely with season and global events. US imports also pay merchandise and harbor maintenance fees (about 0.47% combined).",
    faq: [
      { question: "How much does it cost to ship a 40 ft container?", answer: "All-in door-to-door costs commonly run $3,500–$8,000+ from Asia to North America or Europe, depending on market rates." },
      { question: "Should I choose a 20 ft or 40 ft container?", answer: "A 40 ft costs only about 20–40% more than a 20 ft but holds twice the volume, so it's usually cheaper per unit for light goods." },
    ],
  },
  {
    slug: "container-load-calculator",
    title: "Container Load Calculator",
    description: "Work out how many cartons fit in a 20 ft, 40 ft or 40 ft high-cube shipping container — limited by space and by maximum payload — and how full it will be.",
    metaTitle: "Container Load Calculator — Cartons per Container",
    metaDescription: "Free container load calculator. Find how many boxes fit in a 20 ft, 40 ft or 40 HC container by dimensions and weight limit.",
    calcInputs: [
      CONTAINER(0),
      numberField("lengthCm", "Carton Length", { unit: "cm", default: 60, max: 600, step: 1 }),
      numberField("widthCm", "Carton Width", { unit: "cm", default: 40, max: 230, step: 1 }),
      numberField("heightCm", "Carton Height", { unit: "cm", default: 40, max: 260, step: 1 }),
      numberField("weightKg", "Carton Weight", { unit: "kg", default: 15, max: 2000, step: 0.1 }),
      dropdown("upright", "Orientation", [["Any side down", 0], ["This side up only", 1]], 1),
    ],
    calcResult: { label: "Max Cartons", format: "number" },
    calcResults: [
      { key: "maxCartons", label: "Cartons That Fit", format: "number", highlight: true },
      { key: "cartonsBySpace", label: "Cartons by Space Alone", format: "number" },
      { key: "cartonsByWeight", label: "Cartons by Payload Limit", format: "number" },
      { key: "volumeUsedPercent", label: "Container Volume Used (%)", format: "percentage" },
      { key: "totalWeightKg", label: "Total Cargo Weight (kg)", format: "number" },
    ],
    instructions: "Choose the container and enter one carton's outer dimensions and weight. Choose 'this side up' if cartons can't be laid on their sides.",
    examples: "Example: 60 × 40 × 40 cm cartons weighing 15 kg fit 225 to a 20 ft container standing upright, using 65.06% of its volume.",
    assumptions: "Inside dimensions: 20 ft 5.89 × 2.35 × 2.39 m; 40 ft 12.03 × 2.35 × 2.39 m; 40 HC 12.03 × 2.35 × 2.69 m. Uses the best single orientation in neat rows; mixed orientations can squeeze in a few more. Road weight limits may be lower than container payload limits.",
    faq: [
      { question: "How many boxes fit in a 20 ft container?", answer: "It depends on box size — about 225–250 cartons of 60 × 40 × 40 cm, or 1,000+ shoebox-sized cartons." },
      { question: "How much weight can a 40 ft container hold?", answer: "About 26,500 kg of cargo, but US road limits often cap a loaded 40 ft at roughly 20,000 kg of cargo." },
    ],
  },
  {
    slug: "cbm-calculator",
    title: "CBM Calculator",
    description: "Calculate cubic metres (CBM) for cartons or a shipment — with cubic feet, air chargeable weight, sea freight revenue tons and how much of a 20 ft container it fills.",
    metaTitle: "CBM Calculator — Cubic Meters for Shipping",
    metaDescription: "Free CBM calculator. Find cubic meters and cubic feet of cartons, plus air chargeable weight, sea revenue tons and container fill.",
    calcInputs: [
      numberField("lengthCm", "Carton Length", { unit: "cm", default: 50, max: 1500, step: 0.5 }),
      numberField("widthCm", "Carton Width", { unit: "cm", default: 40, max: 500, step: 0.5 }),
      numberField("heightCm", "Carton Height", { unit: "cm", default: 30, max: 500, step: 0.5 }),
      numberField("quantity", "Number of Cartons", { default: 100, min: 1, max: 100000 }),
      numberField("weightKgEach", "Weight per Carton", { unit: "kg", default: 10, max: 5000, step: 0.1, required: false }),
    ],
    calcResult: { label: "Total CBM", format: "number" },
    calcResults: [
      { key: "totalCbm", label: "Total Volume (m³ / CBM)", format: "number", decimals: 3, highlight: true },
      { key: "cubicFeet", label: "Total Volume (cu ft)", format: "number" },
      { key: "airChargeableKg", label: "Air Chargeable Weight (kg)", format: "number" },
      { key: "seaRevenueTons", label: "Sea Freight Revenue Tons (W/M)", format: "number", decimals: 3 },
      { key: "percentOf20ftContainer", label: "Share of a 20 ft Container (%)", format: "percentage" },
    ],
    instructions: "Enter one carton's outer dimensions in centimetres, how many cartons, and each carton's weight.",
    examples: "Example: 100 cartons of 50 × 40 × 30 cm total 6 CBM (211.89 cu ft) — about 18.07% of a 20 ft container.",
    assumptions: "CBM = L × W × H (cm) ÷ 1,000,000 × quantity. Air chargeable weight uses 1 m³ = 166.67 kg (÷ 6,000). Sea LCL charges per revenue ton: the greater of cubic metres and metric tons (W/M). A 20 ft container holds about 33 m³ (25–28 m³ practically).",
    faq: [
      { question: "How do I calculate CBM?", answer: "Multiply length × width × height in metres (or in cm and divide by 1,000,000), then multiply by the number of cartons." },
      { question: "How many CBM fit in a 40 ft container?", answer: "About 67 m³ in a standard 40 ft and 76 m³ in a high cube, though 55–68 m³ is realistic once loaded." },
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
