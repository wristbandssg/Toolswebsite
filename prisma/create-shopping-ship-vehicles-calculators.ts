// One-time (but safe to re-run) batch setup script: creates 6 vehicle and bulky-goods shipping tools
// from the user's shopping list (Shopping Calculators > Shipping & Moving Cost Calculators).
// See src/lib/calc-engine-shopping-ship-vehicles.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-ship-vehicles-calculators.ts
// or
//   npm run db:create-shopping-ship-vehicles-calculators

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

const MILES = (def: number) => numberField("distanceMiles", "Distance", { unit: "miles", default: def, max: 5000, step: 1 });
const RANGE_RESULTS = (first: string) => [
  { key: "estimatedCost", label: first, format: "currency", highlight: true },
  { key: "lowEstimate", label: "Low Estimate", format: "currency" },
  { key: "highEstimate", label: "High Estimate", format: "currency" },
  { key: "costPerMile", label: "Cost per Mile", format: "currency" },
];

const TOOLS: ToolDef[] = [
  {
    slug: "car-shipping-cost-calculator",
    title: "Car Shipping Cost Calculator",
    description: "Estimate what it costs to ship a car by distance and vehicle type — open or enclosed transport, running or inoperable, standard or expedited — with a price range and transit time.",
    metaTitle: "Car Shipping Cost Calculator — Auto Transport",
    metaDescription: "Free car shipping cost calculator. Estimate auto transport cost by distance and vehicle type, open vs enclosed, with transit days.",
    calcInputs: [
      MILES(1000),
      dropdown("vehicleType", "Vehicle Type", [["Sedan / coupe", 0], ["SUV / crossover", 1], ["Pickup / van", 2], ["Oversized or modified", 3]], 0),
      dropdown("transport", "Transport Type", [["Open carrier", 0], ["Enclosed carrier", 1]], 0),
      dropdown("running", "Vehicle Condition", [["Runs and drives", 0], ["Inoperable (needs winch)", 1]], 0),
      dropdown("expedited", "Pickup Speed", [["Standard window (1–5 days)", 0], ["Expedited / guaranteed date", 1]], 0),
    ],
    calcResult: { label: "Estimated Cost", format: "currency" },
    calcResults: [...RANGE_RESULTS("Estimated Shipping Cost"), { key: "transitDays", label: "Typical Transit Time (Days)", format: "number" }],
    instructions: "Enter the pickup-to-delivery distance, vehicle type and transport options. Enclosed transport protects classic, exotic and luxury cars; open carriers are standard and cheaper.",
    examples: "Example: shipping a running sedan 1,000 miles on an open carrier costs about $1,039.14 (range $883.27–$1,246.97), taking about 4 days.",
    assumptions: "Price per mile falls with distance (short hauls about $1–$2 per mile, cross-country about $0.60–$0.90). Enclosed costs about 60% more; inoperable vehicles add a winch fee. 2026 planning estimates — prices rise in summer and snowbird season and for rural pickups.",
    faq: [
      { question: "How much does it cost to ship a car across the country?", answer: "Usually about $1,300–$2,200 on an open carrier and $2,000–$3,500 enclosed for a standard sedan." },
      { question: "Is it cheaper to drive or ship a car?", answer: "For long distances, shipping often costs about the same as gas, hotels, food and wear — and saves several days." },
    ],
  },
  {
    slug: "boat-shipping-cost-calculator",
    title: "Boat Shipping Cost Calculator",
    description: "Estimate the cost of transporting a boat over land by length, beam and distance — with oversize permits and escort vehicles for wide boats and prep like shrink-wrapping.",
    metaTitle: "Boat Shipping Cost Calculator — Boat Transport",
    metaDescription: "Free boat shipping cost calculator. Estimate boat transport cost by length, beam and distance with oversize permits and escorts.",
    calcInputs: [
      numberField("lengthFt", "Boat Length", { unit: "ft", default: 25, max: 100, step: 1 }),
      numberField("beamFt", "Beam (Width)", { unit: "ft", default: 8.5, max: 25, step: 0.5 }),
      MILES(500),
      dropdown("onOwnTrailer", "Trailer", [["Hauler supplies a hydraulic trailer", 0], ["Boat is on its own trailer", 1]], 1),
      currencyField("prepCost", "Prep (Shrink-Wrap, Mast Unstep, Blocking)", { default: 0, max: 20000, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Transport Cost", format: "currency", highlight: true },
      { key: "haulingCost", label: "Hauling Cost", format: "currency" },
      { key: "permitsAndEscorts", label: "Oversize Permits & Escorts", format: "currency" },
      { key: "costPerMile", label: "Cost per Mile", format: "currency" },
      { key: "oversizeLoad", label: "Oversize Load? (1 = Yes, Over 8.5 ft)", format: "number" },
    ],
    instructions: "Enter the boat's length overall and widest beam, the distance, whether it travels on its own trailer, and any prep work like shrink-wrapping, unstepping a sailboat mast or removing the tower.",
    examples: "Example: a 25 ft boat with an 8.5 ft beam on its own trailer going 500 miles costs about $1,250.00 — $2.50 per mile.",
    assumptions: "Hauling about $2 per mile plus about $0.10 per mile per foot over 20 ft, with a minimum charge. Boats wider than 8.5 ft need oversize permits; over about 12 ft usually need escort cars. 2026 estimates; yachts over 40 ft often ship by sea or on specialized trailers.",
    faq: [
      { question: "How much does it cost to ship a boat?", answer: "Commonly $2–$5 per mile for trailerable boats, so 500 miles runs about $1,000–$2,500 before permits and prep." },
      { question: "What size boat needs a permit to transport?", answer: "In most states, any boat with a beam over 8.5 ft needs an oversize permit, and wider loads may need escorts." },
    ],
  },
  {
    slug: "motorcycle-shipping-cost-calculator",
    title: "Motorcycle Shipping Cost Calculator",
    description: "Estimate motorcycle shipping cost by distance — open or enclosed trailer or crated freight, standard bike or large touring model — with a range and transit time.",
    metaTitle: "Motorcycle Shipping Cost Calculator",
    metaDescription: "Free motorcycle shipping cost calculator. Estimate the cost to ship a motorcycle by distance, open vs enclosed or crated, with transit days.",
    calcInputs: [
      MILES(1000),
      dropdown("method", "Method", [["Open trailer", 0], ["Enclosed trailer", 1], ["Crated freight", 2]], 0),
      dropdown("bikeType", "Motorcycle Type", [["Standard / sport / dirt bike", 0], ["Large touring / trike", 1]], 0),
      currencyField("crateFee", "Crating Fee (Crated Freight Only)", { default: 250, max: 2000, required: false }),
    ],
    calcResult: { label: "Estimated Cost", format: "currency" },
    calcResults: [...RANGE_RESULTS("Estimated Shipping Cost"), { key: "transitDays", label: "Typical Transit Time (Days)", format: "number" }],
    instructions: "Enter the distance, choose open or enclosed trailer or crated freight, and the bike type. Crated freight needs the bike drained and crated (the crating fee applies only to that method).",
    examples: "Example: shipping a standard motorcycle 1,000 miles on an open trailer costs about $683.48 (range $580.96–$820.18).",
    assumptions: "Cost per mile falls with distance; enclosed adds about 40%, crated freight about 25% plus crating. Touring bikes and trikes cost about 15% more. 2026 planning estimates — door-to-door, insured carriers.",
    faq: [
      { question: "How much does it cost to ship a motorcycle?", answer: "Typically $400–$900 for 500–1,000 miles and $1,000–$1,500 cross-country on an open trailer." },
      { question: "Is enclosed motorcycle shipping worth it?", answer: "For high-value, vintage or show bikes, yes — it keeps off weather and road debris." },
    ],
  },
  {
    slug: "heavy-equipment-shipping-cost-calculator",
    title: "Heavy Equipment Shipping Cost Calculator",
    description: "Estimate the cost of hauling heavy equipment — excavators, tractors, dozers — by weight, width and distance on a flatbed, step deck or RGN lowboy, with permits and escorts.",
    metaTitle: "Heavy Equipment Shipping Cost Calculator",
    metaDescription: "Free heavy equipment shipping calculator. Estimate hauling cost by weight, width and distance on flatbed, step deck or RGN with permits.",
    calcInputs: [
      numberField("weightLb", "Equipment Weight", { unit: "lb", default: 30000, max: 200000, step: 100 }),
      numberField("widthFt", "Equipment Width", { unit: "ft", default: 9, max: 20, step: 0.5 }),
      MILES(400),
      dropdown("trailer", "Trailer Type", [["Flatbed", 0], ["Step deck", 1], ["RGN / lowboy", 2]], 2),
      numberField("statesCrossed", "States Crossed (Permits)", { default: 2, min: 1, max: 20 }),
      currencyField("loadingFee", "Loading / Crane Fee", { default: 0, max: 20000, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Hauling Cost", format: "currency", highlight: true },
      { key: "haulingCost", label: "Line Haul", format: "currency" },
      { key: "permitCost", label: "Oversize / Overweight Permits", format: "currency" },
      { key: "escortCost", label: "Escort (Pilot) Cars", format: "currency" },
      { key: "costPerMile", label: "All-In Cost per Mile", format: "currency" },
      { key: "oversizeOrOverweight", label: "Oversize or Overweight? (1 = Yes)", format: "number" },
    ],
    instructions: "Enter the machine's operating weight and widest width (tracks, blade or bucket), the distance, trailer type and how many states the route crosses. RGN trailers carry tall and heavy machines; step decks suit mid-size equipment.",
    examples: "Example: a 30,000 lb, 9 ft wide excavator on an RGN for 400 miles across two states costs about $2,400.00, including $200.00 in oversize permits.",
    assumptions: "Typical 2026 rates: flatbed about $3, step deck $3.50 and RGN $5.50 per loaded mile, with a minimum charge. Loads over 8.5 ft wide or about 48,000 lb of cargo need permits in each state; widths over 12 ft generally need escorts (two over 14 ft).",
    faq: [
      { question: "How much does it cost to ship an excavator?", answer: "Often $3–$7 per mile depending on size, so a few hundred miles typically costs $1,500–$4,000 plus permits." },
      { question: "When does equipment need an oversize permit?", answer: "When the load is wider than 8.5 ft, taller than about 13.5 ft or heavier than the legal 80,000 lb gross vehicle weight." },
    ],
  },
  {
    slug: "furniture-shipping-cost-calculator",
    title: "Furniture Shipping Cost Calculator",
    description: "Estimate the cost to ship furniture — a sofa, dresser or a few pieces — by volume and distance with curbside freight, blanket-wrap or white-glove delivery.",
    metaTitle: "Furniture Shipping Cost Calculator",
    metaDescription: "Free furniture shipping cost calculator. Estimate the cost to ship a sofa or furniture by volume and distance, curbside to white glove.",
    calcInputs: [
      numberField("cubicFeet", "Total Volume of Furniture", { unit: "cu ft", default: 60, max: 2000, step: 1 }),
      MILES(800),
      dropdown("service", "Service", [["Curbside freight (you pack and carry)", 0], ["Blanket wrap (no boxes needed)", 1], ["White glove (in-home, assembly)", 2]], 1),
      currencyField("crating", "Crating for Fragile Pieces", { default: 0, max: 5000, required: false }),
    ],
    calcResult: { label: "Estimated Cost", format: "currency" },
    calcResults: [
      ...RANGE_RESULTS("Estimated Shipping Cost").filter((r) => r.key !== "costPerMile"),
      { key: "costPerCubicFoot", label: "Cost per Cubic Foot", format: "currency" },
      { key: "estimatedWeightLb", label: "Estimated Weight (lb)", format: "number" },
    ],
    instructions: "Estimate the volume: a 3-seat sofa is about 40–60 cu ft, a dresser 20–30, a dining table 15–30, a queen bed set about 60–70. Choose the service and add crating for glass, marble or antiques.",
    examples: "Example: a 60 cu ft sofa shipped 800 miles by blanket wrap costs about $336.00 (range $268.80–$420.00).",
    assumptions: "Cost per cubic foot rises with distance; blanket wrap costs about 1.6× and white glove 2.4× curbside freight, with a minimum charge. Weight is estimated at 7 lb per cu ft. 2026 planning estimates — marketplace couriers can be cheaper on popular routes.",
    faq: [
      { question: "How much does it cost to ship a couch?", answer: "Typically $150–$500 regionally and $400–$1,200+ cross-country, depending on size and service." },
      { question: "What is white glove furniture delivery?", answer: "Full-service delivery: the carrier brings the piece inside to the room, unpacks, assembles and removes packaging." },
    ],
  },
  {
    slug: "wine-shipping-cost-calculator",
    title: "Wine Shipping Cost Calculator",
    description: "Estimate the cost of shipping wine bottles — boxes and packaging, ground or express, distance zone, insurance and the required adult-signature fee — per shipment and per bottle.",
    metaTitle: "Wine Shipping Cost Calculator — Per Bottle",
    metaDescription: "Free wine shipping cost calculator. Estimate the cost to ship wine bottles with packaging, speed, zone, insurance and adult signature.",
    calcInputs: [
      numberField("bottles", "Number of Bottles", { default: 6, min: 1, max: 600 }),
      dropdown("bottlesPerBox", "Shipper Size", [["1-bottle shipper", 1], ["2-bottle shipper", 2], ["3-bottle shipper", 3], ["6-bottle shipper", 6], ["12-bottle shipper", 12]], 6),
      numberField("zone", "Shipping Zone (1–8)", { default: 5, min: 1, max: 8 }),
      dropdown("service", "Service", [["Ground", 0], ["2-day", 1], ["Overnight", 2]], 0),
      currencyField("adultSignatureFee", "Adult Signature Fee per Box", { default: 7.5, max: 20, step: 0.25 }),
      currencyField("declaredValue", "Wine Value to Insure", { default: 200, max: 100000, required: false }),
      currencyField("insurancePer100", "Insurance per $100", { default: 1.5, max: 10, step: 0.05, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Total Shipping Cost", format: "currency", highlight: true },
      { key: "shippingCost", label: "Carrier Charges (Incl. Signature)", format: "currency" },
      { key: "packagingCost", label: "Foam / Pulp Shippers", format: "currency" },
      { key: "insuranceCost", label: "Insurance", format: "currency" },
      { key: "costPerBottle", label: "Cost per Bottle", format: "currency" },
      { key: "boxes", label: "Boxes Needed", format: "number" },
    ],
    instructions: "Enter the number of bottles, the shipper size you'll pack them in, the zone, speed, and the value to insure. Shipping wine requires an adult (21+) signature.",
    examples: "Example: six bottles in a 6-bottle shipper going to zone 5 by ground cost about $70.41 — $11.74 per bottle including packaging, signature and insurance.",
    assumptions: "Each 750 ml bottle in a shipper weighs about 3 lb, plus 2 lb per box. Carrier prices are 2026 retail estimates. USPS doesn't allow consumers to mail alcohol; UPS and FedEx require licensed shippers or approved stores, and some states restrict direct shipments.",
    faq: [
      { question: "How much does it cost to ship a case of wine?", answer: "Usually $40–$90 by ground for 12 bottles, and $120–$250+ overnight, plus packaging." },
      { question: "Can I ship wine to a friend?", answer: "In the US, private individuals generally must use a licensed shipping store or winery; carriers don't accept alcohol from the public directly." },
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
