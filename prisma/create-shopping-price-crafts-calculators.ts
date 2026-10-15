// One-time (but safe to re-run) batch setup script: creates 12 craft and art pricing tools
// from the user's shopping list (Shopping Calculators > Pricing, Markup & Seller Fee Calculators).
// See src/lib/calc-engine-shopping-price-crafts.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-price-crafts-calculators.ts
// or
//   npm run db:create-shopping-price-crafts-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Pricing, Markup & Seller Fee Calculators", slug: "pricing-markup-seller-fee-calculators" };

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

const MAKER_NOTE = "Price for wholesale even if you only sell retail now — it leaves room for shops, markets and sales without losing money.";

const TOOLS: ToolDef[] = [
  {
    slug: "candle-pricing-calculator",
    title: "Candle Pricing Calculator",
    description: "Price handmade candles from the wax by weight, fragrance load, vessel, wick and label, and your time — with wholesale and retail prices per candle.",
    metaTitle: "Candle Pricing Calculator — Cost & Retail Price",
    metaDescription: "Free candle pricing calculator. Work out the cost per candle from wax, fragrance oil, vessel, wick and labor, and set wholesale and retail prices.",
    calcInputs: [
      numberField("candleOz", "Candle Fill Weight", { unit: "oz", default: 8, max: 100, step: 0.5 }),
      currencyField("waxPerLb", "Wax Price per Pound", { default: 3.2, max: 100, step: 0.05 }),
      percentField("fragranceLoad", "Fragrance Load", { default: 8, max: 15, step: 0.5 }),
      currencyField("fragrancePerOz", "Fragrance Oil per Ounce", { default: 1.9, max: 50, step: 0.05 }),
      currencyField("vesselWickLabel", "Vessel, Lid, Wick & Label", { default: 2.75, max: 100, step: 0.05 }),
      numberField("minutesPerCandle", "Your Time per Candle", { unit: "minutes", default: 10, max: 240 }),
      currencyField("hourlyRate", "Your Hourly Rate", { default: 18, max: 500, step: 1 }),
      numberField("retailMultiple", "Retail Price ÷ Cost", { default: 2.5, min: 1, max: 6, step: 0.1 }),
    ],
    calcResult: { label: "Retail Price", format: "currency" },
    calcResults: [
      { key: "retailPrice", label: "Retail Price", format: "currency", highlight: true },
      { key: "wholesalePrice", label: "Wholesale Price (2× Cost)", format: "currency" },
      { key: "costPerCandle", label: "Cost per Candle", format: "currency" },
      { key: "materialsPerCandle", label: "Materials per Candle", format: "currency" },
      { key: "waxAndFragrance", label: "Wax & Fragrance", format: "currency" },
      { key: "profitAtRetail", label: "Profit at Retail", format: "currency" },
    ],
    instructions:
      "Enter the candle's fill weight, your wax price per pound, the fragrance load (6–10% is typical) and fragrance oil price, and the cost of the jar, lid, wick and label.\n\n" +
      "Add your time per candle and hourly rate, and how far above cost you price retail.",
    examples: "Example: an 8 oz candle with $3.20/lb wax, 8% fragrance at $1.90/oz, $2.75 of vessel and wick and 10 minutes of work at $18 an hour costs $8.36. Wholesale at $16.71 and retail at $20.89.",
    assumptions: "Fill weight = wax + fragrance, with fragrance load measured against the wax weight. Wholesale = cost × 2; retail = cost × your multiple (2.5–3× is common for handmade candles). " + MAKER_NOTE,
    faq: [
      { question: "How much does it cost to make a candle?", answer: "An 8 oz soy candle typically costs $4–$8 in materials, mostly the vessel and fragrance oil, before your time." },
      { question: "How much should I sell homemade candles for?", answer: "Many makers sell 8 oz candles for $18–$30, about 2.5–3 times the full cost including labor." },
    ],
  },
  {
    slug: "soap-pricing-calculator",
    title: "Soap Pricing Calculator",
    description: "Price handmade soap per bar from a batch's oils, lye, fragrance and additives, packaging and your time — with wholesale and retail prices.",
    metaTitle: "Soap Pricing Calculator — Cost per Bar & Price",
    metaDescription: "Free soap pricing calculator. Find the cost per bar of handmade soap from oils, lye, additives, packaging and labor, and set prices.",
    calcInputs: [
      currencyField("oilsCost", "Oils & Butters per Batch", { default: 32, max: 10000, step: 0.5 }),
      currencyField("lyeCost", "Lye per Batch", { default: 3.5, max: 1000, step: 0.25 }),
      currencyField("additivesCost", "Fragrance, Colorants & Additives", { default: 12, max: 10000, step: 0.5, required: false }),
      numberField("barsPerBatch", "Bars per Batch", { default: 16, min: 1, max: 10000 }),
      currencyField("packagingPerBar", "Packaging & Label per Bar", { default: 0.6, max: 50, step: 0.05, required: false }),
      numberField("hours", "Hours per Batch (Make, Cut, Wrap)", { unit: "hours", default: 2.5, max: 100, step: 0.25 }),
      currencyField("hourlyRate", "Your Hourly Rate", { default: 18, max: 500, step: 1 }),
      numberField("retailMultiple", "Retail Price ÷ Cost", { default: 2.5, min: 1, max: 6, step: 0.1 }),
    ],
    calcResult: { label: "Retail Price per Bar", format: "currency" },
    calcResults: [
      { key: "retailPrice", label: "Retail Price per Bar", format: "currency", highlight: true },
      { key: "wholesalePrice", label: "Wholesale Price per Bar", format: "currency" },
      { key: "costPerBar", label: "Cost per Bar", format: "currency" },
      { key: "ingredientsPerBar", label: "Ingredients per Bar", format: "currency" },
      { key: "profitPerBatchRetail", label: "Profit per Batch at Retail", format: "currency" },
    ],
    instructions:
      "Enter what one batch costs in oils and butters, lye and additives, how many bars it makes, and packaging per bar. Add the hands-on hours per batch — curing time doesn't count.",
    examples: "Example: a 16-bar batch with $47.50 of ingredients, $0.60 of packaging per bar and 2.5 hours at $18 costs $6.38 a bar. Sell wholesale at $12.76 and retail at $15.95.",
    assumptions: "Wholesale = cost × 2; retail = cost × your multiple. Handmade cold-process bars usually sell for $6–$12. Remember the 4–6 week cure ties up stock before you can sell it. " + MAKER_NOTE,
    faq: [
      { question: "How much does it cost to make a bar of soap?", answer: "Ingredients for a 4–5 oz bar usually cost $1–$3; with packaging and labor the full cost is often $3–$5." },
      { question: "How much should I sell handmade soap for?", answer: "Commonly $6 to $12 per bar, depending on ingredients, size and where you sell." },
    ],
  },
  {
    slug: "crochet-pricing-calculator",
    title: "Crochet Pricing Calculator",
    description: "Price crochet items — blankets, amigurumi, clothing — from the yarn, other materials and the hours you spend, with your hourly rate and profit.",
    metaTitle: "Crochet Pricing Calculator — Price Your Items",
    metaDescription: "Free crochet pricing calculator. Price crochet blankets, amigurumi and wearables from yarn, materials, hours and hourly rate, plus profit.",
    calcInputs: [
      numberField("skeins", "Skeins of Yarn Used", { default: 8, max: 1000, step: 0.5 }),
      currencyField("pricePerSkein", "Price per Skein", { default: 6.5, max: 500, step: 0.05 }),
      currencyField("otherMaterials", "Other Materials (Eyes, Stuffing, Buttons)", { default: 3, max: 1000, step: 0.5, required: false }),
      numberField("hours", "Hours to Make", { unit: "hours", default: 20, max: 1000, step: 0.5 }),
      currencyField("hourlyRate", "Your Hourly Rate", { default: 12, max: 500, step: 1 }),
      percentField("profitPercent", "Profit", { default: 10, max: 200, step: 1 }),
    ],
    calcResult: { label: "Price", format: "currency" },
    calcResults: [
      { key: "price", label: "Price to Charge", format: "currency", highlight: true },
      { key: "materials", label: "Materials", format: "currency" },
      { key: "laborValue", label: "Your Labor", format: "currency" },
      { key: "profit", label: "Profit", format: "currency" },
      { key: "effectiveHourly", label: "What You Earn per Hour", format: "currency" },
    ],
    instructions:
      "Enter the skeins of yarn and price per skein, plus other materials. Track the hours honestly — blankets often take 20–60 hours — and choose an hourly rate and profit.",
    examples: "Example: a blanket using 8 skeins at $6.50 plus $3 of materials and 20 hours at $12 an hour, with 10% profit, should sell for $324.50 — $13.48 an hour for your time.",
    assumptions: "Price = (materials + hours × rate) × (1 + profit). Large crochet pieces priced this way are often more than buyers expect; many makers focus on smaller, faster items for markets and take blanket commissions at full price.",
    faq: [
      { question: "How do you price crochet items?", answer: "Add the cost of yarn and materials to your hours times an hourly rate, then add profit. Some makers use materials × 3 for small items." },
      { question: "How much should a crochet blanket cost?", answer: "Priced fairly for 20–60 hours of work, a handmade blanket often lands between $200 and $800." },
    ],
  },
  {
    slug: "woodworking-pricing-calculator",
    title: "Woodworking Pricing Calculator",
    description: "Price furniture and woodworking projects from lumber (with waste), hardware and finish, your hours and a shop rate for tools and space, plus profit.",
    metaTitle: "Woodworking Pricing Calculator — Price a Project",
    metaDescription: "Free woodworking pricing calculator. Price furniture and wood projects from lumber, waste, hardware, finish, labor, shop rate and profit.",
    calcInputs: [
      currencyField("lumberCost", "Lumber Cost", { default: 180, max: 100000, step: 1 }),
      percentField("wastePercent", "Lumber Waste Allowance", { default: 15, max: 50, step: 1 }),
      currencyField("hardwareFinish", "Hardware, Glue, Sandpaper & Finish", { default: 45, max: 10000, step: 1, required: false }),
      numberField("hours", "Hours", { unit: "hours", default: 14, max: 1000, step: 0.5 }),
      currencyField("hourlyRate", "Your Hourly Rate", { default: 30, max: 500, step: 1 }),
      currencyField("shopRatePerHour", "Shop Rate per Hour (Tools, Space, Power)", { default: 6, max: 200, step: 0.5, required: false }),
      percentField("profitPercent", "Profit", { default: 20, max: 200, step: 1 }),
    ],
    calcResult: { label: "Price", format: "currency" },
    calcResults: [
      { key: "price", label: "Price to Charge", format: "currency", highlight: true },
      { key: "materials", label: "Materials (With Waste)", format: "currency" },
      { key: "laborAndShop", label: "Labor & Shop Time", format: "currency" },
      { key: "profit", label: "Profit", format: "currency" },
      { key: "materialsShareOfPrice", label: "Materials as % of Price", format: "percentage" },
    ],
    instructions:
      "Enter the lumber cost and a waste allowance, then hardware and finishing supplies. Add your hours, hourly rate and a shop rate to cover tools, blades, power and space, then profit.",
    examples: "Example: $180 of lumber with 15% waste, $45 of hardware and finish, and 14 hours at $30 plus a $6 shop rate, with 20% profit, should be priced at $907.20.",
    assumptions: "Price = (lumber × (1 + waste) + hardware + hours × (rate + shop rate)) × (1 + profit). Many furniture makers find materials end up at 20–35% of the price; if yours is much higher, labor is probably under-priced.",
    faq: [
      { question: "How do you price woodworking projects?", answer: "Add materials with waste, your labor at an hourly rate and a shop rate for tools and space, then add 15–30% profit." },
      { question: "What is a shop rate?", answer: "An hourly charge that covers the cost of owning and running your tools and workspace — blades, bits, power, dust collection and rent." },
    ],
  },
  {
    slug: "handmade-pricing-calculator",
    title: "Handmade Pricing Calculator",
    description: "Price any handmade product with the classic maker's formula — (materials + labor + overhead) × 2 for wholesale, × 2 again for retail — and see your profit at each.",
    metaTitle: "Handmade Pricing Calculator — Wholesale & Retail",
    metaDescription: "Free handmade pricing calculator. Use the (materials + labor + overhead) × 2 × 2 formula to set wholesale and retail prices for crafts.",
    calcInputs: [
      currencyField("materials", "Materials per Item", { default: 6, max: 100000, step: 0.05 }),
      numberField("hours", "Time per Item", { unit: "hours", default: 0.75, max: 1000, step: 0.05 }),
      currencyField("hourlyRate", "Your Hourly Rate", { default: 18, max: 500, step: 1 }),
      percentField("overheadPercent", "Overhead (Tools, Fees, Packaging, Space)", { default: 15, max: 100, step: 1 }),
      numberField("wholesaleMultiple", "Wholesale Multiplier", { default: 2, min: 1, max: 5, step: 0.1 }),
      numberField("retailMultiple", "Retail Multiplier (on Wholesale)", { default: 2, min: 1, max: 5, step: 0.1 }),
    ],
    calcResult: { label: "Retail Price", format: "currency" },
    calcResults: [
      { key: "retailPrice", label: "Retail Price", format: "currency", highlight: true },
      { key: "wholesalePrice", label: "Wholesale Price", format: "currency" },
      { key: "totalCost", label: "Total Cost", format: "currency" },
      { key: "laborCost", label: "Labor Cost", format: "currency" },
      { key: "profitAtWholesale", label: "Profit at Wholesale", format: "currency" },
      { key: "profitAtRetail", label: "Profit at Retail", format: "currency" },
    ],
    instructions:
      "Enter materials per item, your time per item and hourly rate, and overhead as a percentage. The standard formula doubles your cost for wholesale and doubles that for retail — change the multipliers if your market differs.",
    examples: "Example: $6 of materials and 45 minutes at $18 an hour, with 15% overhead, cost $22.42. Wholesale is $44.85 and retail $89.70.",
    assumptions: "Cost = (materials + labor) × (1 + overhead). Wholesale = cost × 2; retail = wholesale × 2. If the retail price is too high for your market, look for faster methods or cheaper materials rather than cutting your wage. " + MAKER_NOTE,
    faq: [
      { question: "What is the formula for pricing handmade items?", answer: "A common one: (materials + labor + overhead) × 2 = wholesale price, and wholesale × 2 = retail price." },
      { question: "Why double the cost for wholesale?", answer: "The doubling builds in profit to grow your business; shops then double the wholesale price to cover their own costs." },
    ],
  },
  {
    slug: "handmade-jewelry-pricing-calculator",
    title: "Handmade Jewelry Pricing Calculator",
    description: "Price handmade jewelry with the jeweler's formula — materials × 2 plus labor and overhead for wholesale, then a retail multiple — from metal, stones, findings and time.",
    metaTitle: "Handmade Jewelry Pricing Calculator — Price a Piece",
    metaDescription: "Free handmade jewelry pricing calculator. Price pieces from metal, stones, findings, labor and overhead using the materials × 2 formula.",
    calcInputs: [
      currencyField("metalCost", "Metal (Wire, Sheet, Chain)", { default: 14, max: 100000, step: 0.05 }),
      currencyField("stonesBeads", "Stones, Beads & Pearls", { default: 9, max: 100000, step: 0.05, required: false }),
      currencyField("findings", "Findings (Clasps, Jump Rings, Ear Wires)", { default: 2.5, max: 10000, step: 0.05, required: false }),
      numberField("hours", "Time to Make", { unit: "hours", default: 1.5, max: 500, step: 0.25 }),
      currencyField("hourlyRate", "Your Hourly Rate", { default: 22, max: 500, step: 1 }),
      percentField("overheadPercent", "Overhead", { default: 10, max: 100, step: 1, required: false }),
      numberField("retailMultiple", "Retail Multiple (on Wholesale)", { default: 2, min: 1, max: 4, step: 0.1 }),
    ],
    calcResult: { label: "Retail Price", format: "currency" },
    calcResults: [
      { key: "retailPrice", label: "Retail Price", format: "currency", highlight: true },
      { key: "wholesalePrice", label: "Wholesale Price", format: "currency" },
      { key: "materials", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "totalCost", label: "Total Cost", format: "currency" },
      { key: "profitAtRetail", label: "Profit at Retail", format: "currency" },
    ],
    instructions:
      "Enter what the metal, stones or beads and findings cost for one piece, how long it takes and your hourly rate, then overhead and the retail multiple.",
    examples: "Example: $25.50 of materials and 1.5 hours at $22, with 10% overhead. Wholesale = materials × 2 + labor + overhead = $89.85; retail at 2× is $179.70.",
    assumptions: "Wholesale = materials × 2 + labor + overhead; retail = wholesale × 2 (2–3× is common). Doubling materials covers sourcing time and price rises — re-price gold and silver pieces when metal prices move. " + MAKER_NOTE,
    faq: [
      { question: "How do you price handmade jewelry?", answer: "A popular formula is (materials × 2) + labor + overhead for wholesale, then double it for retail." },
      { question: "Should I re-price when silver or gold prices rise?", answer: "Yes. Precious metal prices change often, so update material costs at least every few months." },
    ],
  },
  {
    slug: "quilt-pricing-calculator",
    title: "Quilt Pricing Calculator",
    description: "Price a handmade quilt by size — longarm quilting per square inch, binding per inch, piecing time and fabric — or estimate a longarm quilter's charge.",
    metaTitle: "Quilt Pricing Calculator — Price a Handmade Quilt",
    metaDescription: "Free quilt pricing calculator. Price a quilt by size from longarm quilting per square inch, binding, piecing hours, fabric and profit.",
    calcInputs: [
      dropdown("size", "Quilt Size", [["Baby / crib (36 × 52 in)", 0], ["Throw (50 × 65 in)", 1], ["Twin (70 × 90 in)", 2], ["Full (80 × 90 in)", 3], ["Queen (90 × 95 in)", 4], ["King (108 × 95 in)", 5]], 4),
      currencyField("quiltingPerSqIn", "Quilting Rate per Square Inch", { default: 0.025, max: 1, step: 0.001 }),
      currencyField("bindingPerInch", "Binding per Linear Inch", { default: 0.15, max: 2, step: 0.01, required: false }),
      numberField("piecingHours", "Piecing Hours", { unit: "hours", default: 30, max: 1000, step: 1, required: false }),
      currencyField("hourlyRate", "Hourly Rate for Piecing", { default: 15, max: 200, step: 1, required: false }),
      currencyField("fabricBatting", "Fabric, Batting & Backing", { default: 180, max: 10000, step: 1, required: false }),
      percentField("profitPercent", "Profit", { default: 10, max: 200, step: 1, required: false }),
    ],
    calcResult: { label: "Quilt Price", format: "currency" },
    calcResults: [
      { key: "quiltPrice", label: "Quilt Price", format: "currency", highlight: true },
      { key: "quiltingCost", label: "Quilting (Longarm)", format: "currency" },
      { key: "bindingCost", label: "Binding", format: "currency" },
      { key: "piecingLabor", label: "Piecing Labor", format: "currency" },
      { key: "squareInches", label: "Square Inches", format: "number" },
      { key: "pricePerSqIn", label: "Price per Square Inch", format: "currency", decimals: 3 },
    ],
    instructions:
      "Choose the quilt size, then the quilting rate per square inch (about $0.015 for simple edge-to-edge and $0.03–$0.08+ for custom quilting) and binding per inch.\n\n" +
      "For a finished quilt you sell, add piecing hours, fabric and profit. For just a longarm quote, set piecing and fabric to 0.",
    examples: "Example: a queen quilt (8,550 sq in) quilted at 2.5¢ per square inch costs $213.75 to quilt. With binding, 30 hours of piecing at $15 and $180 of fabric, plus 10% profit, the quilt is $989.18.",
    assumptions: "Quilting = width × length × rate; binding = perimeter × rate. Handmade queen quilts priced fully for labor often run $800–$2,000; buyers used to factory quilts may balk, so explain the hours involved.",
    faq: [
      { question: "How much does longarm quilting cost?", answer: "Roughly 1.5 to 3 cents per square inch for edge-to-edge designs and 3 to 8+ cents for custom work — about $130–$250 for a queen edge-to-edge." },
      { question: "How do you price a handmade quilt?", answer: "Add fabric and batting, piecing hours at an hourly rate, quilting by the square inch and binding by the inch, then add profit." },
    ],
  },
  {
    slug: "resin-price-calculator",
    title: "Resin Price Calculator",
    description: "Price epoxy resin art, coasters, trays and jewelry from the resin volume at your cost per ml (with waste), molds, pigments and inclusions, and your time.",
    metaTitle: "Resin Price Calculator — Price Resin Art",
    metaDescription: "Free resin price calculator. Find the cost of resin used per piece from kit price and volume, add materials and labor, and set a price.",
    calcInputs: [
      numberField("resinMl", "Resin Used in the Piece", { unit: "ml", default: 350, max: 100000, step: 5 }),
      currencyField("kitCost", "Resin Kit Price", { default: 59.99, max: 10000, step: 0.01 }),
      numberField("kitMl", "Resin Kit Volume", { unit: "ml", default: 3785, max: 100000, step: 1 }),
      percentField("wastePercent", "Waste (Mixing Cups, Drips)", { default: 10, max: 50, step: 1 }),
      currencyField("addIns", "Pigments, Inclusions, Molds Wear & Hardware", { default: 8, max: 10000, step: 0.5, required: false }),
      numberField("hours", "Hands-On Hours", { unit: "hours", default: 1.5, max: 100, step: 0.25 }),
      currencyField("hourlyRate", "Your Hourly Rate", { default: 20, max: 500, step: 1 }),
      percentField("profitPercent", "Profit", { default: 30, max: 300, step: 1 }),
    ],
    calcResult: { label: "Price", format: "currency" },
    calcResults: [
      { key: "price", label: "Price to Charge", format: "currency", highlight: true },
      { key: "resinCost", label: "Resin Cost", format: "currency" },
      { key: "materials", label: "All Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "profit", label: "Profit", format: "currency" },
    ],
    instructions:
      "Enter how much mixed resin the piece uses (measure or estimate by volume), your kit price and volume, and a waste allowance. Add pigments, inclusions like flowers or wood, wear on silicone molds and any hardware.\n\n" +
      "Add your hands-on time — not the curing time — and profit.",
    examples: "Example: a tray using 350 ml from a $59.99, 1-gallon (3,785 ml) kit with 10% waste uses $6.10 of resin. With $8 of add-ins and 1.5 hours at $20, plus 30% profit, price it at $57.33.",
    assumptions: "Resin cost = ml used × (1 + waste) × kit price ÷ kit ml. A gallon kit is 3,785 ml (1:1 mix by volume, combined). Deep-pour and river tables use a lot of resin, so measure carefully.",
    faq: [
      { question: "How much resin do I need?", answer: "For a flat piece, length × width × depth in centimetres gives ml. A 12 × 18 in tray at 1/8 in deep needs about 450 ml." },
      { question: "How do I price resin art?", answer: "Add the resin used (with waste), other materials and your hands-on hours at an hourly rate, then add 20–50% profit." },
    ],
  },
  {
    slug: "stained-glass-cost-calculator",
    title: "Stained Glass Cost Calculator",
    description: "Estimate what a custom stained glass panel or window costs by size and design complexity, plus framing and installation, with a low–high range.",
    metaTitle: "Stained Glass Cost Calculator — Panel & Window",
    metaDescription: "Free stained glass cost calculator. Estimate the cost of a custom stained glass panel or window by square feet, design complexity and install.",
    calcInputs: [
      numberField("widthIn", "Width", { unit: "in", default: 24, max: 300 }),
      numberField("heightIn", "Height", { unit: "in", default: 36, max: 300 }),
      dropdown("complexity", "Design Complexity", [["Simple geometric — about $100/sq ft", 0], ["Moderate (some curves) — about $175/sq ft", 1], ["Detailed pictorial — about $275/sq ft", 2], ["Highly intricate / painted — about $400/sq ft", 3]], 1),
      currencyField("framing", "Frame or Hanging Hardware", { default: 120, max: 10000, step: 10, required: false }),
      currencyField("installation", "Installation", { default: 250, max: 20000, step: 10, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "panelCost", label: "Panel Cost", format: "currency" },
      { key: "squareFeet", label: "Square Feet", format: "number" },
      { key: "ratePerSqFt", label: "Rate per Sq Ft", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions:
      "Enter the panel's width and height in inches and choose how complex the design is. Add framing or hanging hardware and installation if it's going into a window.",
    examples: "Example: a 24 × 36 in panel (6 sq ft) of moderate complexity at $175 per sq ft is $1,050.00; with a frame and installation the total is about $1,420.00, likely between $1,136.00 and $1,775.00.",
    assumptions: "Studios commonly charge $100–$500+ per square foot depending on design, glass choice and painting. Insulated units for exterior windows, restoration of old windows and protective glazing cost extra. Get quotes from local studios for an exact price.",
    faq: [
      { question: "How much does a stained glass window cost?", answer: "Typically $100 to $400+ per square foot, so a 2 × 3 ft panel often costs $600–$2,400 before installation." },
      { question: "Why does stained glass cost so much?", answer: "Each piece of glass is hand-cut, foiled or leaded and soldered; intricate designs can take dozens of hours per square foot." },
    ],
  },
  {
    slug: "art-print-price-calculator",
    title: "Art Print Price Calculator",
    description: "Price art prints from the printing cost, packaging and signing, at your markup — with a premium for limited editions and the profit after selling fees.",
    metaTitle: "Art Print Price Calculator — Open & Limited Editions",
    metaDescription: "Free art print price calculator. Price open and limited edition prints from print and packaging costs, markup and marketplace fees.",
    calcInputs: [
      currencyField("printCost", "Printing Cost per Print", { default: 9, max: 10000, step: 0.25 }),
      currencyField("packaging", "Sleeve, Backing Board & Mailer", { default: 2.5, max: 1000, step: 0.25, required: false }),
      currencyField("signingMounting", "Signing, Numbering, Certificate", { default: 0.5, max: 100, step: 0.25, required: false }),
      numberField("markupMultiple", "Markup Multiple", { default: 3, min: 1, max: 10, step: 0.25 }),
      dropdown("edition", "Edition", [["Open edition", 0], ["Limited edition", 1]], 1),
      percentField("limitedPremium", "Limited Edition Premium", { default: 50, max: 300, step: 5, required: false }),
      numberField("editionSize", "Edition Size", { default: 50, max: 10000, required: false }),
      percentField("salesFeePercent", "Marketplace & Payment Fees", { default: 10, max: 50, step: 0.5, required: false }),
    ],
    calcResult: { label: "Print Price", format: "currency" },
    calcResults: [
      { key: "printPrice", label: "Print Price", format: "currency", highlight: true },
      { key: "costPerPrint", label: "Cost per Print", format: "currency" },
      { key: "marketplaceFee", label: "Fees per Sale", format: "currency" },
      { key: "profitPerPrint", label: "Profit per Print", format: "currency" },
      { key: "editionRevenue", label: "Profit If the Edition Sells Out", format: "currency" },
    ],
    instructions:
      "Enter what each print costs to produce (lab price or your paper and ink), packaging and signing costs, and your markup multiple. For limited editions, add a premium and the edition size.\n\n" +
      "Enter marketplace and payment fees to see real profit.",
    examples: "Example: a $9 print with $3 of packaging and signing at 3× markup and a 50% limited-edition premium sells for $54.00. After 10% fees you keep $36.60 each — $1,830.00 if all 50 sell.",
    assumptions: "Open-edition prints usually sell at 2–4× cost; numbered limited editions command more, and smaller editions more again. Giclée prints on archival paper cost more to produce than standard prints.",
    faq: [
      { question: "How much should I charge for art prints?", answer: "Commonly 2.5–4 times the production cost for open editions, and more for small, signed limited editions." },
      { question: "What is a limited edition print?", answer: "A print run with a fixed number of copies, each signed and numbered, which makes each one scarcer and more valuable." },
    ],
  },
  {
    slug: "painting-price-calculator",
    title: "Painting Price Calculator",
    description: "Price original paintings consistently by size — per square inch or per linear inch — plus canvas and framing costs recovered at twice cost.",
    metaTitle: "Painting Price Calculator — Price Original Art",
    metaDescription: "Free painting price calculator. Price original artwork by square inch or linear inch, add canvas and frame costs, and keep prices consistent.",
    calcInputs: [
      numberField("widthIn", "Width", { unit: "in", default: 24, max: 500 }),
      numberField("heightIn", "Height", { unit: "in", default: 30, max: 500 }),
      dropdown("method", "Pricing Method", [["Per square inch", 0], ["Per linear inch (width + height)", 1]], 0),
      currencyField("ratePerSqIn", "Rate per Square Inch", { default: 0.75, max: 100, step: 0.05 }),
      currencyField("ratePerLinearIn", "Rate per Linear Inch", { default: 12, max: 1000, step: 0.5, required: false }),
      currencyField("canvasCost", "Canvas & Materials", { default: 45, max: 10000, step: 1, required: false }),
      currencyField("frameCost", "Frame Cost", { default: 0, max: 10000, step: 1, required: false }),
    ],
    calcResult: { label: "Painting Price", format: "currency" },
    calcResults: [
      { key: "paintingPrice", label: "Painting Price", format: "currency", highlight: true },
      { key: "squareInchPrice", label: "Price by Square Inch", format: "currency" },
      { key: "linearInchPrice", label: "Price by Linear Inch", format: "currency" },
      { key: "materialsRecovered", label: "Canvas & Frame (2× Cost)", format: "currency" },
      { key: "squareInches", label: "Square Inches", format: "number" },
    ],
    instructions:
      "Enter the painting's size and choose a method. Set a rate per square inch (emerging artists often $0.50–$2, established artists more) or per linear inch, then add canvas and frame costs.\n\n" +
      "Use the same rate for all your work so prices are consistent across sizes.",
    examples: "Example: a 24 × 30 in painting (720 sq in) at $0.75 per square inch is $540, plus $45 of canvas recovered at 2× — $630.00. By linear inch at $12 it would be $738.00.",
    assumptions: "Square-inch pricing scales faster for large works; linear-inch pricing keeps big pieces more affordable. Materials are added at twice cost. Raise your rate as sales, shows and demand grow — never lower prices for collectors who already bought.",
    faq: [
      { question: "How do artists price paintings?", answer: "Many multiply width × height by a set rate per square inch, then add the cost of canvas and frame, so every piece is priced consistently." },
      { question: "What should my price per square inch be?", answer: "Emerging artists often start around $0.50–$2 per square inch and raise it as they build a track record of sales." },
    ],
  },
  {
    slug: "commission-price-calculator",
    title: "Commission Price Calculator",
    description: "Price art and digital art commissions from your hours and rate, extra characters, background, rush fee and personal or commercial use — with the deposit to ask for.",
    metaTitle: "Commission Price Calculator — Art & Digital Art",
    metaDescription: "Free art commission price calculator. Price digital and traditional commissions from hours, rate, extra characters, background, rush and usage.",
    calcInputs: [
      numberField("hours", "Estimated Hours", { unit: "hours", default: 6, max: 500, step: 0.5 }),
      currencyField("hourlyRate", "Your Hourly Rate", { default: 25, max: 500, step: 1 }),
      numberField("extraCharacters", "Extra Characters", { default: 1, max: 20 }),
      percentField("extraCharacterPercent", "Charge per Extra Character (% of Base)", { default: 50, max: 100, step: 5, required: false }),
      currencyField("backgroundFee", "Background Fee", { default: 30, max: 10000, step: 5, required: false }),
      dropdown("usage", "Usage Rights", [["Personal use", 0], ["Commercial use (2×)", 1], ["Exclusive commercial / full rights (3×)", 2]], 0),
      percentField("rushPercent", "Rush Fee", { default: 0, max: 100, step: 5, required: false }),
      percentField("depositPercent", "Upfront Deposit", { default: 50, max: 100, step: 5, required: false }),
    ],
    calcResult: { label: "Commission Price", format: "currency" },
    calcResults: [
      { key: "commissionPrice", label: "Commission Price", format: "currency", highlight: true },
      { key: "basePrice", label: "Base Price (Hours × Rate)", format: "currency" },
      { key: "extrasCost", label: "Extra Characters & Background", format: "currency" },
      { key: "usageMultiplier", label: "Usage Multiplier", format: "number" },
      { key: "rushFee", label: "Rush Fee", format: "currency" },
      { key: "deposit", label: "Deposit to Request", format: "currency" },
    ],
    instructions:
      "Estimate the hours for one character at the requested finish (sketch, flat colour, full render), and enter your hourly rate. Add extra characters, a background and any rush fee.\n\n" +
      "Choose personal or commercial use — commercial work (logos, merch, book covers) is priced higher.",
    examples: "Example: a 6-hour piece at $25 an hour with one extra character at 50% and a $30 background comes to $255.00 for personal use. Ask for a $127.50 deposit before starting.",
    assumptions: "Extra characters are charged as a share of the base price; commercial use multiplies the total. Many artists take 50% (or 100% for smaller pieces) upfront, and state the number of revisions included in their terms.",
    faq: [
      { question: "How much should I charge for an art commission?", answer: "Estimate your hours, multiply by an hourly rate, and add for extra characters, backgrounds, rush jobs and commercial rights." },
      { question: "How much more is a commercial-use commission?", answer: "Commonly 2 to 3 times the personal-use price, or more for exclusive rights." },
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
