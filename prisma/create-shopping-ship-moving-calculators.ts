// One-time (but safe to re-run) batch setup script: creates 7 moving and storage tools
// from the user's shopping list (Shopping Calculators > Shipping & Moving Cost Calculators).
// See src/lib/calc-engine-shopping-ship-moving.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-ship-moving-calculators.ts
// or
//   npm run db:create-shopping-ship-moving-calculators

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

const HOME = (def: number) => dropdown("homeSize", "Home Size", [["Studio", 0], ["1 bedroom", 1], ["2 bedrooms", 2], ["3 bedrooms", 3], ["4 bedrooms", 4], ["5+ bedrooms", 5]], def);
const YESNO = (key: string, label: string, def: number) => dropdown(key, label, [["No", 0], ["Yes", 1]], def);

const TOOLS: ToolDef[] = [
  {
    slug: "moving-cost-calculator",
    title: "Moving Cost Calculator",
    description: "Estimate the cost of a local move with professional movers — crew size, hours, stairs, drive time, packing service, truck fee and tip — by home size.",
    metaTitle: "Moving Cost Calculator — Local Movers Estimate",
    metaDescription: "Free moving cost calculator. Estimate local movers' cost by home size with crew, hours, stairs, packing, truck fee and tip.",
    calcInputs: [
      HOME(2),
      currencyField("hourlyPerMover", "Hourly Rate per Mover", { default: 60, max: 300 }),
      numberField("driveMinutes", "Drive Time Between Homes", { unit: "min", default: 30, max: 300, step: 5 }),
      dropdown("stairs", "Stairs / Access", [["Ground floor or elevator", 0], ["One flight of stairs", 1], ["Two+ flights or long carry", 2]], 0),
      YESNO("packing", "Movers Pack Everything", 0),
      currencyField("truckFee", "Truck / Travel Fee", { default: 150, max: 2000 }),
      percentField("tipPercent", "Tip (% of Labor)", { default: 10, max: 30, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Moving Cost", format: "currency", highlight: true },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "estimatedHours", label: "Estimated Hours", format: "number" },
      { key: "movers", label: "Movers in the Crew", format: "number" },
      { key: "packingMaterials", label: "Packing Materials", format: "currency" },
      { key: "tip", label: "Tip", format: "currency" },
    ],
    instructions: "Choose your home size, enter the local hourly rate per mover (often $40–$80 in 2026), drive time between homes, access at the tougher of the two homes, and whether movers pack for you.",
    examples: "Example: a 2-bedroom local move with a 3-person crew at $60 per mover-hour takes about 6.5 hours and costs about $1,437.00 including the truck fee and a 10% tip.",
    assumptions: "Typical crews: 2 movers for studios and 1-bedrooms, 3 for 2–3 bedrooms, 4 for larger homes; hours scale with home size, stairs and drive time, billed in half-hours. Full packing adds about 40% time plus materials. Many companies have a 2–3 hour minimum.",
    faq: [
      { question: "How much do local movers cost?", answer: "About $400–$800 for a studio or 1-bedroom, $800–$2,000 for 2–3 bedrooms and $2,000–$4,000+ for large homes." },
      { question: "How much should I tip movers?", answer: "Commonly $20–$40 per mover for a half day, $40–$80 for a full day, or about 10–15% of the labor cost." },
    ],
  },
  {
    slug: "long-distance-moving-cost-calculator",
    title: "Long Distance Moving Cost Calculator",
    description: "Estimate the cost of a long-distance or interstate move by shipment weight (or home size) and miles — with packing, storage-in-transit and full-value protection.",
    metaTitle: "Long Distance Moving Cost Calculator",
    metaDescription: "Free long distance moving cost calculator. Estimate interstate move cost by weight or home size and miles with packing and storage.",
    calcInputs: [
      HOME(3),
      numberField("weightLb", "Shipment Weight (0 = Estimate From Home Size)", { unit: "lb", default: 0, max: 40000, step: 100, required: false }),
      numberField("distanceMiles", "Distance", { unit: "miles", default: 1000, max: 5000, step: 10 }),
      YESNO("packing", "Full Packing Service", 0),
      numberField("storageMonths", "Storage-in-Transit", { unit: "months", default: 0, max: 24, step: 1, required: false }),
      currencyField("declaredValue", "Declared Value for Full-Value Protection", { default: 0, max: 1000000, required: false }),
      percentField("valuationRate", "Full-Value Protection Rate", { default: 1, max: 5, step: 0.1, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Moving Cost", format: "currency", highlight: true },
      { key: "transportCost", label: "Loading, Transport & Unloading", format: "currency" },
      { key: "packingCost", label: "Packing Service", format: "currency" },
      { key: "storageCost", label: "Storage-in-Transit", format: "currency" },
      { key: "valuationCost", label: "Full-Value Protection", format: "currency" },
      { key: "shipmentWeightLb", label: "Shipment Weight Used (lb)", format: "number" },
      { key: "costPerMile", label: "Cost per Mile", format: "currency" },
    ],
    instructions: "Choose the home size (or enter the weight from a mover's survey), the distance, and options. Full-value protection typically costs about 1% of the declared value; basic coverage at $0.60 per pound is free but pays little.",
    examples: "Example: a 3-bedroom home (about 9,000 lb) moving 1,000 miles costs about $7,050.00 — $7.05 per mile.",
    assumptions: "Interstate movers price by weight and distance. Typical weights: studio 2,000 lb, 1BR 3,500, 2BR 6,000, 3BR 9,000, 4BR 12,000, 5BR+ 15,000. Rates are 2026 planning estimates; long carries, stairs, shuttles and peak summer dates add cost. Get at least three binding estimates.",
    faq: [
      { question: "How much does a long distance move cost?", answer: "A 2–3 bedroom move of about 1,000 miles typically costs $4,500–$9,000; cross-country often $7,000–$15,000." },
      { question: "How do movers estimate the weight?", answer: "From an in-home or video survey of your belongings; the truck is weighed empty and full on the moving day for weight-based billing." },
    ],
  },
  {
    slug: "pod-moving-cost-calculator",
    title: "PODS Moving Cost Calculator",
    description: "Estimate the cost of moving with portable storage containers (PODS-style) — 8, 12 or 16 ft containers, local or long distance, monthly rental, delivery fees and loading help.",
    metaTitle: "PODS Moving Cost Calculator — Portable Containers",
    metaDescription: "Free portable container moving calculator. Estimate PODS-style moving cost by container size, distance, months, delivery and labor.",
    calcInputs: [
      dropdown("containerSize", "Container Size", [["8 ft (studio / small)", 0], ["12 ft (1–2 rooms)", 1], ["16 ft (2–3 rooms)", 2]], 2),
      numberField("containers", "Number of Containers", { default: 1, min: 1, max: 10 }),
      numberField("distanceMiles", "Moving Distance", { unit: "miles", default: 800, max: 5000, step: 10 }),
      numberField("months", "Months You Keep the Container", { default: 1, min: 1, max: 36 }),
      currencyField("deliveryFee", "Fee per Delivery / Pickup", { default: 80, max: 500 }),
      numberField("laborHours", "Loading Help (Hours for 2 Movers)", { default: 3, max: 24, step: 0.5, required: false }),
      currencyField("laborRate", "Hourly Rate per Helper", { default: 50, max: 200, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "transportCost", label: "Long-Distance Transport", format: "currency" },
      { key: "rentalCost", label: "Container Rental", format: "currency" },
      { key: "deliveryFees", label: "Delivery & Pickup Fees", format: "currency" },
      { key: "laborCost", label: "Loading Help", format: "currency" },
      { key: "costPerContainer", label: "Cost per Container", format: "currency" },
    ],
    instructions: "Pick the container size and count, the distance (50 miles or less counts as local), how many months you'll keep it, and any hired loading help. A 16 ft container holds about a 2–3 room home.",
    examples: "Example: one 16 ft container moved 800 miles and kept for a month costs about $3,330.00, including $300.00 for 3 hours of 2-person loading help.",
    assumptions: "Local moves pay delivery, pickup and redelivery fees plus monthly rent; long-distance adds transport that grows with miles (2026 estimates). Prices vary a lot by city and season — request quotes from PODS, U-Pack, U-Box and others.",
    faq: [
      { question: "How much does a PODS container cost?", answer: "Local moves often run $400–$1,000 for the first month; long distance moves commonly cost $2,000–$5,000+ per container." },
      { question: "How many PODS do I need?", answer: "A 16 ft container fits about 2–3 rooms; a 3–4 bedroom home usually needs two 16 ft containers." },
    ],
  },
  {
    slug: "moving-truck-size-calculator",
    title: "Moving Truck Size Calculator",
    description: "Find what size rental moving truck you need — 10, 15, 20 or 26 ft — from your home size and how much stuff you have, with load percentage and a local rental estimate.",
    metaTitle: "Moving Truck Size Calculator — What Size Truck?",
    metaDescription: "Free moving truck size calculator. Find whether you need a 10, 15, 20 or 26 ft rental truck by home size and belongings.",
    calcInputs: [
      HOME(2),
      dropdown("furnishing", "How Much Stuff", [["Minimal", 0], ["Average", 1], ["Lots (heavily furnished)", 2]], 1),
      numberField("extraCubicFeet", "Extra Items (Garage, Patio, Shed)", { unit: "cu ft", default: 0, max: 2000, step: 10, required: false }),
      numberField("localMiles", "Local Miles Driven", { unit: "miles", default: 40, max: 1000, step: 1, required: false }),
      currencyField("perMile", "Mileage Rate", { default: 1.1, max: 5, step: 0.01, required: false }),
    ],
    calcResult: { label: "Truck Size", format: "number" },
    calcResults: [
      { key: "truckLengthFt", label: "Recommended Truck Length (ft)", format: "number", highlight: true },
      { key: "cubicFeetNeeded", label: "Cargo Space Needed (cu ft)", format: "number" },
      { key: "loadPercent", label: "Truck Space Used (%)", format: "percentage" },
      { key: "trucksNeeded", label: "Trucks (or Trips) Needed", format: "number" },
      { key: "localRentalEstimate", label: "Local Rental Estimate", format: "currency" },
    ],
    instructions: "Choose your home size and how full it is, add anything from a garage, patio or shed, and enter your expected local mileage and rate for the rental estimate.",
    examples: "Example: an average 2-bedroom home needs about 900 cu ft — a 20 ft truck (88.58% full), about $84.00 for a local rental.",
    assumptions: "Typical volumes: studio 400 cu ft, 1BR 600, 2BR 900, 3BR 1,250, 4BR 1,600, 5BR+ 2,000. Truck capacities (U-Haul-style): 10 ft ≈ 400, 15 ft ≈ 760, 20 ft ≈ 1,015, 26 ft ≈ 1,680 cu ft. Local rentals charge a day rate plus mileage; one-way rentals are priced differently.",
    faq: [
      { question: "What size truck do I need for a 2-bedroom apartment?", answer: "A 15 ft truck fits a lightly furnished 2-bedroom; an average or well-furnished one usually needs a 20 ft." },
      { question: "Is it better to rent a bigger moving truck?", answer: "Slightly bigger is safer than making a second trip — the price difference between sizes is usually small." },
    ],
  },
  {
    slug: "moving-box-calculator",
    title: "Moving Box Calculator",
    description: "Find how many moving boxes you need — small, medium, large and wardrobe — plus tape and the total cost of supplies, based on home size, household size and how much you own.",
    metaTitle: "Moving Box Calculator — How Many Boxes?",
    metaDescription: "Free moving box calculator. Find how many small, medium, large and wardrobe boxes and tape rolls you need and what they cost.",
    calcInputs: [
      HOME(2),
      numberField("people", "People in the Household", { default: 2, min: 1, max: 12 }),
      dropdown("stuffLevel", "How Much Stuff", [["Minimalist", 0], ["Average", 1], ["Lots", 2]], 1),
      currencyField("smallPrice", "Small Box Price", { default: 1.5, max: 20, step: 0.05 }),
      currencyField("mediumPrice", "Medium Box Price", { default: 2.25, max: 20, step: 0.05 }),
      currencyField("largePrice", "Large Box Price", { default: 3, max: 20, step: 0.05 }),
      currencyField("wardrobePrice", "Wardrobe Box Price", { default: 18, max: 60, step: 0.5 }),
    ],
    calcResult: { label: "Total Boxes", format: "number" },
    calcResults: [
      { key: "totalBoxes", label: "Total Boxes", format: "number", highlight: true },
      { key: "smallBoxes", label: "Small Boxes (Books, Heavy Items)", format: "number" },
      { key: "mediumBoxes", label: "Medium Boxes (Kitchen, Toys)", format: "number" },
      { key: "largeBoxes", label: "Large Boxes (Linens, Light Items)", format: "number" },
      { key: "wardrobeBoxes", label: "Wardrobe Boxes", format: "number" },
      { key: "tapeRolls", label: "Rolls of Packing Tape", format: "number" },
      { key: "estimatedCost", label: "Estimated Supply Cost", format: "currency" },
    ],
    instructions: "Choose your home size, number of people and how much you own, and adjust box prices for your store (or set them to zero for free boxes).",
    examples: "Example: an average 2-bedroom home for two people needs about 58 boxes — 25 small, 20 medium, 10 large and 3 wardrobe — costing about $182.50 with tape.",
    assumptions: "Base counts for an average home scale with your stuff level and add about 10% per person beyond two. One roll of tape seals about 15 boxes. Pack heavy items in small boxes and keep each box under about 50 lb.",
    faq: [
      { question: "How many boxes do I need to move?", answer: "Roughly 30–40 for a 1-bedroom, 50–70 for a 2-bedroom and 80–100+ for a 3-bedroom home." },
      { question: "Where can I get free moving boxes?", answer: "Grocery and liquor stores, local buy-nothing groups and online marketplaces often have boxes free for the taking." },
    ],
  },
  {
    slug: "storage-unit-size-calculator",
    title: "Storage Unit Size Calculator",
    description: "Find the right storage unit size — 5×5 up to 10×30 — from the rooms of furniture, boxes and large items you're storing, and whether you're adding a car.",
    metaTitle: "Storage Unit Size Calculator — What Size Unit?",
    metaDescription: "Free storage unit size calculator. Find the storage unit size you need from rooms of furniture, boxes, large items and a vehicle.",
    calcInputs: [
      numberField("rooms", "Furnished Rooms to Store", { default: 2, max: 20, step: 0.5 }),
      numberField("boxes", "Boxes (Medium Size)", { default: 30, max: 1000 }),
      numberField("largeItems", "Extra Large Items (Appliances, Bikes, Mowers)", { default: 2, max: 100, required: false }),
      YESNO("vehicle", "Also Storing a Car", 0),
      numberField("stackHeightFt", "How High You'll Stack", { unit: "ft", default: 7, min: 3, max: 10, step: 0.5 }),
    ],
    calcResult: { label: "Unit Size", format: "number" },
    calcResults: [
      { key: "unitSqFt", label: "Unit Size in sq ft (25 = 5×5, 50 = 5×10, 75 = 5×15, 100 = 10×10, 150 = 10×15, 200 = 10×20, 300 = 10×30)", format: "number", highlight: true },
      { key: "unitsNeeded", label: "Units Needed", format: "number" },
      { key: "volumeCuFt", label: "Volume of Your Belongings (cu ft)", format: "number" },
      { key: "floorAreaNeededSqFt", label: "Floor Area Needed (sq ft)", format: "number" },
      { key: "fillPercent", label: "Unit Fill (%)", format: "percentage" },
    ],
    instructions: "Count the furnished rooms you're storing, medium boxes, and extra-large items, say whether you're storing a car, and how high you can safely stack (most units have 8 ft ceilings).",
    examples: "Example: two furnished rooms, 30 boxes and 2 large items fill about 650 cu ft, which fits a 150 sq ft unit (10 × 15) at 88.44% full.",
    assumptions: "About 250 cu ft per furnished room, 3 cu ft per medium box and 30 cu ft per large item; packing efficiency of 70% leaves room for aisles and odd shapes. A car needs about 180 sq ft (a 10 × 20 unit).",
    faq: [
      { question: "What fits in a 10×10 storage unit?", answer: "About the contents of a 1–2 bedroom apartment: a bedroom set, living room furniture, appliances and boxes." },
      { question: "What size storage unit do I need for a 3-bedroom house?", answer: "Usually a 10 × 20; a 10 × 30 if you have lots of furniture, appliances or garage items." },
    ],
  },
  {
    slug: "storage-unit-cost-calculator",
    title: "Storage Unit Cost Calculator",
    description: "Estimate what a self-storage unit will cost over your stay — by unit size, local market and climate control, with insurance, admin fee and move-in discount.",
    metaTitle: "Storage Unit Cost Calculator — Monthly & Total",
    metaDescription: "Free storage unit cost calculator. Estimate monthly and total self-storage cost by unit size, climate control, insurance and fees.",
    calcInputs: [
      dropdown("unit", "Unit Size", [["5 × 5", 0], ["5 × 10", 1], ["5 × 15", 2], ["10 × 10", 3], ["10 × 15", 4], ["10 × 20", 5], ["10 × 30", 6]], 3),
      numberField("months", "Months of Storage", { default: 6, max: 120 }),
      dropdown("market", "Location", [["Small town / low cost", 0], ["Average suburb", 1], ["Big city", 2]], 1),
      YESNO("climate", "Climate Controlled", 0),
      currencyField("insurancePerMonth", "Insurance / Protection per Month", { default: 12, max: 100, step: 0.5, required: false }),
      currencyField("adminFee", "One-Time Admin Fee", { default: 25, max: 200, required: false }),
      percentField("firstMonthDiscount", "First-Month Discount", { default: 50, max: 100, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Total Cost for the Stay", format: "currency", highlight: true },
      { key: "monthlyRent", label: "Monthly Rent", format: "currency" },
      { key: "averagePerMonth", label: "Average All-In per Month", format: "currency" },
      { key: "costPerSqFtMonth", label: "Rent per sq ft per Month", format: "currency" },
      { key: "moveInDiscount", label: "Move-In Discount", format: "currency" },
    ],
    instructions: "Choose the unit size (use the Storage Unit Size Calculator if unsure), how long you'll store, your area and whether you need climate control. Add the facility's insurance and admin fee and any move-in promotion.",
    examples: "Example: a 10 × 10 unit in an average suburb for 6 months costs about $130.00 a month — $812.00 in total with insurance, the admin fee and 50% off the first month.",
    assumptions: "Average 2026 US non-climate rents: 5×5 about $45, 5×10 $70, 10×10 $130, 10×20 $215, 10×30 $300 a month; big cities run about 40% higher and climate control about 30% more. Facilities often raise rent after a few months, so long stays may cost more.",
    faq: [
      { question: "How much is a 10×10 storage unit?", answer: "About $100–$200 a month in most US areas, and $200+ in big cities or with climate control." },
      { question: "Do I need climate-controlled storage?", answer: "For wood furniture, electronics, documents, photos, instruments and long stays in hot or humid climates, it's worth it." },
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
