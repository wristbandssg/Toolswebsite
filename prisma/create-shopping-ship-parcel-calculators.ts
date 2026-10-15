// One-time (but safe to re-run) batch setup script: creates 9 parcel and postage tools
// from the user's shopping list (Shopping Calculators > Shipping & Moving Cost Calculators).
// See src/lib/calc-engine-shopping-ship-parcel.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-ship-parcel-calculators.ts
// or
//   npm run db:create-shopping-ship-parcel-calculators

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

const ZONE = () => numberField("zone", "Shipping Zone (1–8)", { default: 5, min: 1, max: 8 });
const DIMS = (l: number, w: number, h: number) => [
  numberField("length", "Box Length", { unit: "in", default: l, max: 120, step: 0.5 }),
  numberField("width", "Box Width", { unit: "in", default: w, max: 120, step: 0.5 }),
  numberField("height", "Box Height", { unit: "in", default: h, max: 120, step: 0.5 }),
];

const TOOLS: ToolDef[] = [
  {
    slug: "shipping-cost-calculator",
    title: "Shipping Cost Calculator",
    description: "Estimate what it costs to ship a package in the US by weight, box size, distance zone and speed — using billable (dimensional) weight like UPS, FedEx and USPS.",
    metaTitle: "Shipping Cost Calculator — Package Price Estimate",
    metaDescription: "Free shipping cost calculator. Estimate package shipping cost by weight, box size, zone and ground, 2-day or overnight service.",
    calcInputs: [
      numberField("weightLb", "Package Weight", { unit: "lb", default: 5, max: 150, step: 0.1 }),
      ...DIMS(12, 10, 8),
      ZONE(),
      dropdown("service", "Service Speed", [["Ground (2–5 days)", 0], ["2-day air", 1], ["Overnight", 2]], 0),
    ],
    calcResult: { label: "Estimated Cost", format: "currency" },
    calcResults: [
      { key: "estimatedCost", label: "Estimated Shipping Cost", format: "currency", highlight: true },
      { key: "billableWeightLb", label: "Billable Weight (lb)", format: "number" },
      { key: "dimWeightLb", label: "Dimensional Weight (lb)", format: "number" },
      { key: "costPerLb", label: "Cost per Billable Pound", format: "currency" },
      { key: "groundEquivalent", label: "Same Package by Ground", format: "currency" },
    ],
    instructions: "Weigh the packed box, measure its outside length, width and height, and enter the shipping zone (use the Shipping Zone Calculator if unsure — farther is higher). Choose ground, 2-day or overnight.",
    examples: "Example: a 5 lb box of 12 × 10 × 8 in going to zone 5 by ground bills at 7 lb and costs about $17.91.",
    assumptions: "Billable weight is the greater of actual and dimensional weight (L × W × H ÷ 139), rounded up to the next pound. Prices are typical 2026 retail estimates — online and business accounts pay less; residential, fuel and peak surcharges can add 10–30%.",
    faq: [
      { question: "How is shipping cost calculated?", answer: "Carriers charge by billable weight (actual or dimensional, whichever is higher), distance zone and service speed, plus surcharges." },
      { question: "How can I make shipping cheaper?", answer: "Use the smallest box that fits, buy labels online or through a marketplace, and choose ground or flat-rate boxes for heavy, small items." },
    ],
  },
  {
    slug: "international-shipping-cost-calculator",
    title: "International Shipping Cost Calculator",
    description: "Estimate the cost of sending a parcel from the US abroad — economy, standard or express — plus the import duties and taxes the recipient may pay.",
    metaTitle: "International Shipping Cost Calculator",
    metaDescription: "Free international shipping calculator. Estimate parcel cost abroad by weight, size, region and speed, with duties, taxes and landed total.",
    calcInputs: [
      numberField("weightKg", "Parcel Weight", { unit: "kg", default: 2, max: 70, step: 0.1 }),
      numberField("lengthCm", "Length", { unit: "cm", default: 30, max: 300, step: 1 }),
      numberField("widthCm", "Width", { unit: "cm", default: 25, max: 300, step: 1 }),
      numberField("heightCm", "Height", { unit: "cm", default: 15, max: 300, step: 1 }),
      dropdown("region", "Destination", [["Canada / Mexico", 0], ["Europe / UK", 1], ["Asia", 2], ["Australia, Africa, South America", 3]], 1),
      dropdown("service", "Service", [["Economy postal", 0], ["Standard / priority", 1], ["Express courier", 2]], 1),
      currencyField("declaredValue", "Contents Value", { default: 100, max: 100000 }),
      percentField("dutyRate", "Import Duty Rate", { default: 0, max: 50, required: false }),
      percentField("taxRate", "Import VAT / GST Rate", { default: 20, max: 30, required: false }),
    ],
    calcResult: { label: "Shipping Cost", format: "currency" },
    calcResults: [
      { key: "shippingCost", label: "Estimated Shipping Cost", format: "currency", highlight: true },
      { key: "chargeableKg", label: "Chargeable Weight (kg)", format: "number" },
      { key: "dutiesAndTaxes", label: "Duties & Taxes on Arrival", format: "currency" },
      { key: "landedTotal", label: "Shipping + Duties & Taxes", format: "currency" },
      { key: "typicalDays", label: "Typical Delivery Time (Days)", format: "number" },
    ],
    instructions: "Enter the parcel's weight and size, destination region and service, plus the declared value. Add the destination's duty and VAT/GST rate (UK and EU VAT is about 20%) to see what the recipient may owe.",
    examples: "Example: a 2 kg, 30 × 25 × 15 cm parcel to Europe by standard service costs about $58.00; with 20% VAT on $100 of contents, the landed total is about $89.60.",
    assumptions: "Chargeable weight is the greater of actual and volumetric weight (L × W × H cm ÷ 5,000), in half-kilo steps. Rates are 2026 planning estimates; couriers add fuel surcharges and import fees. Many countries charge VAT on the contents plus shipping, and some have low-value exemptions.",
    faq: [
      { question: "Who pays customs duties on international shipping?", answer: "Usually the recipient on delivery, unless the sender ships DDP (delivered duty paid) and pays in advance." },
      { question: "What is the cheapest way to ship internationally?", answer: "Postal economy services for small, light parcels; for heavy boxes, compare discounted courier labels from online brokers." },
    ],
  },
  {
    slug: "postage-calculator",
    title: "Postage Calculator",
    description: "Work out postage for letters, large envelopes (flats) and small packages by weight — and how many Forever stamps to use — for one piece or a whole mailing.",
    metaTitle: "Postage Calculator — Stamps for Letters & Flats",
    metaDescription: "Free postage calculator. Find postage and Forever stamps needed for letters, large envelopes and small packages by weight in ounces.",
    calcInputs: [
      dropdown("mailType", "Mail Type", [["Letter (up to 3.5 oz)", 0], ["Large envelope / flat (up to 13 oz)", 1], ["Small package (under 1 lb)", 2]], 0),
      numberField("weightOz", "Weight", { unit: "oz", default: 2, max: 16, step: 0.1 }),
      currencyField("firstOunce", "Price for the First Ounce", { default: 0.78, max: 20, step: 0.01 }),
      currencyField("additionalOunce", "Price per Additional Ounce", { default: 0.29, max: 5, step: 0.01 }),
      currencyField("stampPrice", "Forever Stamp Price", { default: 0.78, max: 5, step: 0.01 }),
      numberField("pieces", "Number of Pieces", { default: 1, min: 1, max: 100000 }),
    ],
    calcResult: { label: "Postage per Piece", format: "currency" },
    calcResults: [
      { key: "postagePerPiece", label: "Postage per Piece", format: "currency", highlight: true },
      { key: "totalPostage", label: "Total Postage", format: "currency" },
      { key: "foreverStampsPerPiece", label: "Forever Stamps per Piece", format: "number" },
      { key: "overpaymentPerPiece", label: "Overpayment Using Only Forever Stamps", format: "currency" },
      { key: "overWeightLimit", label: "Over the Weight Limit for This Type? (1 = Yes)", format: "number" },
    ],
    instructions: "Choose the mail type, weigh the piece (round up to the next ounce) and keep or update the prices. Typical 2026 USPS prices: letters $0.78 first ounce + $0.29 each extra; flats about $1.63 + $0.27; packages use Ground Advantage pricing.",
    examples: "Example: a 2 oz letter costs $1.07 — use 2 Forever stamps (overpaying $0.49) or a Forever stamp plus an additional-ounce stamp.",
    assumptions: "Postage = first-ounce price + extra price × additional ounces, rounded up. Square, rigid or lumpy letters pay a non-machinable surcharge (about $0.49). Letters over 3.5 oz are charged as flats; flats over 13 oz go as packages. Prices change — update them when USPS raises rates.",
    faq: [
      { question: "How many stamps do I need for a letter?", answer: "One Forever stamp covers a standard 1 oz letter; add an additional-ounce stamp (or a second Forever stamp) for each extra ounce." },
      { question: "How much postage for a large envelope?", answer: "Large envelopes start at about $1.63 for the first ounce — roughly two Forever stamps plus a bit more for heavier ones." },
    ],
  },
  {
    slug: "overnight-shipping-cost-calculator",
    title: "Overnight Shipping Cost Calculator",
    description: "Estimate next-day shipping cost by weight, box size and zone — end-of-day, by noon or early-morning delivery and Saturday — and compare it with ground.",
    metaTitle: "Overnight Shipping Cost Calculator — Next Day",
    metaDescription: "Free overnight shipping cost calculator. Estimate next-day delivery cost by weight, size, zone and delivery time, versus ground.",
    calcInputs: [
      numberField("weightLb", "Package Weight", { unit: "lb", default: 3, max: 150, step: 0.1 }),
      ...DIMS(12, 9, 6),
      ZONE(),
      dropdown("deliveryBy", "Delivery By", [["End of day (standard overnight)", 0], ["10:30 am / noon (priority)", 1], ["Early morning (first overnight)", 2]], 1),
      dropdown("saturday", "Saturday Delivery", [["No", 0], ["Yes", 1]], 0),
    ],
    calcResult: { label: "Estimated Cost", format: "currency" },
    calcResults: [
      { key: "estimatedCost", label: "Estimated Overnight Cost", format: "currency", highlight: true },
      { key: "billableWeightLb", label: "Billable Weight (lb)", format: "number" },
      { key: "groundCost", label: "Ground Cost for Comparison", format: "currency" },
      { key: "overnightPremium", label: "Extra Cost vs Ground", format: "currency" },
      { key: "saturdayFee", label: "Saturday Delivery Fee", format: "currency" },
    ],
    instructions: "Enter the packed weight, box size and zone, then choose how early it must arrive and whether it needs Saturday delivery.",
    examples: "Example: a 3 lb, 12 × 9 × 6 in box to zone 5 by priority overnight costs about $78.53 — $62.78 more than ground ($15.75).",
    assumptions: "Uses billable weight (actual or L × W × H ÷ 139). Prices are typical 2026 retail estimates for UPS Next Day Air / FedEx Overnight; USPS Priority Mail Express is often cheaper for small items. Cut-off times apply; rural areas may take longer.",
    faq: [
      { question: "How much does overnight shipping cost?", answer: "Small packages commonly cost $40–$120 overnight at retail, rising quickly with weight, distance and earlier delivery times." },
      { question: "What is the cheapest overnight shipping?", answer: "USPS Priority Mail Express for small, light items; for heavier boxes, discounted online UPS or FedEx rates." },
    ],
  },
  {
    slug: "shipping-zone-calculator",
    title: "Shipping Zone Calculator",
    description: "Find the US shipping zone (1–8) for a package from the distance between origin and destination — and what it means for delivery time and price.",
    metaTitle: "Shipping Zone Calculator — USPS & UPS Zones 1–8",
    metaDescription: "Free shipping zone calculator. Find the zone (1–8) from shipping distance, typical ground delivery days and how much zones raise price.",
    calcInputs: [
      numberField("distanceMiles", "Distance From Origin to Destination", { unit: "miles", default: 750, max: 6000, step: 1 }),
    ],
    calcResult: { label: "Zone", format: "number" },
    calcResults: [
      { key: "zone", label: "Shipping Zone", format: "number", highlight: true },
      { key: "typicalGroundDays", label: "Typical Ground Delivery (Business Days)", format: "number" },
      { key: "priceVsZone2", label: "Typical Price vs Zone 2 (%)", format: "percentage" },
      { key: "distanceKm", label: "Distance (km)", format: "number" },
    ],
    instructions: "Enter the straight-line distance between the sending and receiving ZIP codes (a map tool gives this). Carriers use the first three digits of each ZIP to assign the zone.",
    examples: "Example: a package traveling 750 miles is zone 5, usually 4 business days by ground, at about 127.00% of the zone-2 price.",
    assumptions: "USPS-style zones: 1 = up to 50 miles, 2 = 51–150, 3 = 151–300, 4 = 301–600, 5 = 601–1,000, 6 = 1,001–1,400, 7 = 1,401–1,800, 8 = over 1,800. Alaska, Hawaii and territories use zone 9 and above. Prices rise roughly 5–12% per zone.",
    faq: [
      { question: "What are shipping zones?", answer: "Distance bands from the origin ZIP code; the higher the zone, the farther the package travels and the more it costs." },
      { question: "Is zone 8 the most expensive?", answer: "Within the contiguous US, yes — zone 8 covers coast-to-coast shipments over 1,800 miles." },
    ],
  },
  {
    slug: "shipping-insurance-calculator",
    title: "Shipping Insurance Calculator",
    description: "Find the cost to insure a package's declared value, after the coverage your carrier includes free — and how much is at risk if you skip it.",
    metaTitle: "Shipping Insurance Calculator — Declared Value",
    metaDescription: "Free shipping insurance calculator. Find what it costs to insure a package's declared value after included coverage, per package and in total.",
    calcInputs: [
      currencyField("declaredValue", "Declared Value of Contents", { default: 500, max: 100000 }),
      currencyField("includedCoverage", "Coverage Included Free", { default: 100, max: 1000 }),
      currencyField("ratePer100", "Price per $100 of Extra Coverage", { default: 1.5, max: 10, step: 0.05 }),
      currencyField("minimumFee", "Minimum Insurance Fee", { default: 3, max: 50, step: 0.25, required: false }),
      numberField("packages", "Number of Packages", { default: 1, min: 1, max: 10000 }),
    ],
    calcResult: { label: "Insurance Cost", format: "currency" },
    calcResults: [
      { key: "insuranceCost", label: "Insurance Cost per Package", format: "currency", highlight: true },
      { key: "totalForAllPackages", label: "Total for All Packages", format: "currency" },
      { key: "costPercentOfValue", label: "Cost as % of Value", format: "percentage" },
      { key: "amountAtRiskUninsured", label: "Value Not Covered Without Insurance", format: "currency" },
    ],
    instructions: "Enter what the contents are worth (what you can prove with a receipt), the coverage your carrier includes free (often $100), and its price per $100 of extra coverage.",
    examples: "Example: insuring a $500 item with $100 included coverage at $1.50 per $100 costs $6.00 — 1.20% of its value.",
    assumptions: "Cost = price per $100 × each started $100 above the included coverage, subject to a minimum fee. Carriers typically charge about $1–$1.75 per $100; third-party shipping insurance is often cheaper. Claims need proof of value and good packing.",
    faq: [
      { question: "Is shipping insurance worth it?", answer: "For valuable or fragile items over the free coverage limit, usually yes — it costs about 1–2% of value." },
      { question: "How much insurance is included with UPS or FedEx?", answer: "Typically $100 of declared value at no charge; anything above that costs extra." },
    ],
  },
  {
    slug: "dimensional-weight-calculator",
    title: "Dimensional Weight Calculator",
    description: "Calculate a package's dimensional (DIM) weight and billable weight from its size — with the UPS/FedEx 139 divisor or USPS 166 — to see if size, not weight, sets the price.",
    metaTitle: "Dimensional Weight Calculator — DIM & Billable",
    metaDescription: "Free dimensional weight calculator. Find DIM weight and billable weight for UPS, FedEx (139) and USPS (166) from box dimensions.",
    calcInputs: [
      ...DIMS(18, 14, 12),
      numberField("weightLb", "Actual Weight", { unit: "lb", default: 8, max: 500, step: 0.1 }),
      dropdown("divisor", "Carrier DIM Divisor", [["UPS / FedEx (139)", 139], ["USPS (166)", 166], ["Freight / some international (194)", 194]], 139),
    ],
    calcResult: { label: "Billable Weight", format: "number" },
    calcResults: [
      { key: "billableWeightLb", label: "Billable Weight (lb)", format: "number", highlight: true },
      { key: "dimWeightLb", label: "Dimensional Weight (lb)", format: "number" },
      { key: "dimWeightKg", label: "Dimensional Weight (kg)", format: "number" },
      { key: "cubicFeet", label: "Box Volume (cu ft)", format: "number" },
      { key: "dimApplies", label: "Size Sets the Price? (1 = Yes)", format: "number" },
    ],
    instructions: "Measure the box's longest outside dimensions in inches (round each up to the next whole inch), enter its weight and pick your carrier's divisor.",
    examples: "Example: an 18 × 14 × 12 in box weighing 8 lb has a DIM weight of 22 lb with UPS or FedEx, so you pay for 22 lb.",
    assumptions: "DIM weight = L × W × H (in) ÷ divisor, rounded up. UPS and FedEx use 139 for daily and retail rates; USPS uses 166 for boxes over 1 cubic foot. In metric, couriers use L × W × H (cm) ÷ 5,000.",
    faq: [
      { question: "What is dimensional weight?", answer: "A pricing weight based on box size, so large light packages pay for the space they take on the truck or plane." },
      { question: "How do I avoid dimensional weight charges?", answer: "Use the smallest box that protects the item, and consider poly mailers for soft goods." },
    ],
  },
  {
    slug: "us-to-canada-shipping-cost-calculator",
    title: "US to Canada Shipping Cost Calculator",
    description: "Estimate the total cost of shipping a package from the US to Canada — postage or courier, plus Canadian duty, GST/HST and courier brokerage fees.",
    metaTitle: "US to Canada Shipping Cost Calculator",
    metaDescription: "Free US to Canada shipping calculator. Estimate postal or courier cost plus duty, GST/HST and brokerage fees for cross-border parcels.",
    calcInputs: [
      numberField("weightLb", "Package Weight", { unit: "lb", default: 4, max: 150, step: 0.1 }),
      ...DIMS(12, 10, 6),
      dropdown("service", "Service", [["Postal economy (USPS First-Class / Priority Intl)", 0], ["Courier standard (UPS / FedEx ground)", 1], ["Courier express", 2]], 1),
      currencyField("valueUsd", "Contents Value (USD)", { default: 150, max: 100000 }),
      currencyField("dutyFreeLimit", "Duty-Free Limit (USD)", { default: 110, max: 1000 }),
      currencyField("taxFreeLimit", "Tax-Free Limit (USD)", { default: 30, max: 1000 }),
      percentField("dutyRate", "Duty Rate (0% for CUSMA-origin goods)", { default: 0, max: 30, required: false }),
      percentField("salesTaxRate", "GST / HST Rate", { default: 13, max: 15 }),
      currencyField("brokerageFee", "Courier Brokerage Fee", { default: 15, max: 200, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Total Cost to Get It Delivered", format: "currency", highlight: true },
      { key: "shippingCost", label: "Shipping Cost", format: "currency" },
      { key: "dutyCost", label: "Canadian Duty", format: "currency" },
      { key: "salesTaxCost", label: "GST / HST", format: "currency" },
      { key: "brokerage", label: "Brokerage Fee", format: "currency" },
    ],
    instructions: "Enter the package's weight and size, the service and the contents' value. GST is 5%; HST provinces charge 13–15% (Ontario 13%). Courier brokerage is often $10–$30+; postal shipments usually pay a smaller Canada Post handling fee instead.",
    examples: "Example: a 4 lb box worth $150 sent by courier ground costs $41.00 to ship, plus $19.50 HST and $15.00 brokerage — $75.50 in all.",
    assumptions: "Courier shipments under CUSMA are duty-free up to C$150 (about US$110) and tax-free up to C$40 (about US$30); postal gifts and low-value mail have different thresholds. Goods made outside the US/Mexico/Canada can owe duty (often 5–18%). Rates are 2026 estimates.",
    faq: [
      { question: "Do I pay duty on packages from the US to Canada?", answer: "Goods made in the US, Canada or Mexico are usually duty-free; GST/HST applies above C$40 by courier and C$20 by post for most purchases." },
      { question: "Why are courier brokerage fees so high?", answer: "Couriers clear customs for you and charge for it; postal services usually charge much lower handling fees." },
    ],
  },
  {
    slug: "china-shipping-cost-calculator",
    title: "China Shipping Cost Calculator",
    description: "Estimate the cost of shipping goods from China — express courier, air freight, sea LCL or a full container — with duties, port fees and landed cost per shipment.",
    metaTitle: "China Shipping Cost Calculator — Air vs Sea",
    metaDescription: "Free China shipping cost calculator. Compare express, air freight, sea LCL and FCL from China with duties, fees and landed cost.",
    calcInputs: [
      numberField("weightKg", "Total Weight", { unit: "kg", default: 300, max: 30000, step: 1 }),
      numberField("volumeCbm", "Total Volume", { unit: "m³", default: 1.5, max: 70, step: 0.1 }),
      dropdown("method", "Shipping Method", [["Express courier (DHL / FedEx / UPS)", 0], ["Air freight", 1], ["Sea freight LCL (shared container)", 2], ["Sea freight FCL (20 ft containers)", 3]], 2),
      currencyField("goodsValue", "Goods Value", { default: 5000, max: 10000000 }),
      percentField("dutyRate", "Duty + Tariff Rate", { default: 25, max: 200, required: false }),
    ],
    calcResult: { label: "Landed Cost", format: "currency" },
    calcResults: [
      { key: "landedCost", label: "Landed Cost (Goods + Shipping + Duty)", format: "currency", highlight: true },
      { key: "freightCost", label: "Freight Cost", format: "currency" },
      { key: "portAndClearanceFees", label: "Port & Clearance Fees", format: "currency" },
      { key: "dutyCost", label: "Duties & Tariffs", format: "currency" },
      { key: "shippingPercentOfGoods", label: "Shipping & Fees as % of Goods", format: "percentage" },
      { key: "typicalTransitDays", label: "Typical Door-to-Door Days", format: "number" },
    ],
    instructions: "Enter your shipment's total weight and volume (from the supplier's packing list), the method, goods value and your combined duty and tariff rate — US importers should include Section 301 tariffs on Chinese goods.",
    examples: "Example: 300 kg / 1.5 m³ of goods worth $5,000 by sea LCL costs $127.50 in freight plus $450.00 fees and $1,250.00 duty — a landed cost of $6,827.50.",
    assumptions: "Chargeable weight: express max(kg, m³ × 200), air max(kg, m³ × 167), LCL per m³ (1 t = 1 m³, 1 m³ minimum), FCL about 28 m³ per 20 ft box. Rates are typical 2026 estimates and swing with fuel, season and Chinese New Year. Duty rates vary by HS code and change often.",
    faq: [
      { question: "Is it cheaper to ship from China by air or sea?", answer: "Sea is far cheaper per kilogram for shipments over about 1–2 m³; express and air make sense for small, urgent or high-value goods." },
      { question: "How long does shipping from China take?", answer: "Express about 3–7 days, air freight about a week, sea freight about 30–45 days door to door." },
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
