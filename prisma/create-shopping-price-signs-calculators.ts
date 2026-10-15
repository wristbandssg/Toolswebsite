// One-time (but safe to re-run) batch setup script: creates 9 making, sign and framing tools
// from the user's shopping list (Shopping Calculators > Pricing, Markup & Seller Fee Calculators).
// See src/lib/calc-engine-shopping-price-signs.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-price-signs-calculators.ts
// or
//   npm run db:create-shopping-price-signs-calculators

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

const TOOLS: ToolDef[] = [
  {
    slug: "embroidery-cost-calculator",
    title: "Embroidery Cost Calculator",
    description: "Estimate custom embroidery cost per item and per order from the stitch count, price per 1,000 stitches, number of locations, digitizing fee and garment cost.",
    metaTitle: "Embroidery Cost Calculator — Price per Stitch",
    metaDescription: "Free embroidery cost calculator. Price custom embroidered shirts and hats from stitch count, rate per 1,000 stitches, digitizing and garments.",
    calcInputs: [
      numberField("quantity", "Number of Items", { default: 24, min: 1, max: 100000 }),
      numberField("stitchCount", "Stitch Count per Design", { default: 8000, max: 200000, step: 500 }),
      numberField("locations", "Locations per Item", { default: 1, min: 1, max: 6 }),
      currencyField("pricePer1000", "Price per 1,000 Stitches", { default: 1.25, max: 10, step: 0.05 }),
      currencyField("digitizingFee", "One-Time Digitizing Fee", { default: 50, max: 1000, step: 5, required: false }),
      currencyField("garmentCost", "Garment / Hat Cost", { default: 9, max: 200, step: 0.25, required: false }),
    ],
    calcResult: { label: "Price per Item", format: "currency" },
    calcResults: [
      { key: "pricePerItem", label: "Price per Item", format: "currency", highlight: true },
      { key: "orderTotal", label: "Order Total", format: "currency" },
      { key: "embroideryPerItem", label: "Embroidery per Item", format: "currency" },
      { key: "digitizingPerItem", label: "Digitizing per Item", format: "currency" },
      { key: "totalStitchesPerItem", label: "Stitches per Item", format: "number" },
    ],
    instructions:
      "Enter the quantity and the design's stitch count (a left-chest logo is often 5,000–10,000 stitches; a full back 30,000+), the number of locations and the price per 1,000 stitches. Add the digitizing fee and the garment cost.",
    examples: "Example: 24 polos with an 8,000-stitch logo at $1.25 per 1,000 stitches cost $10.00 each to embroider. With a $50 digitizing fee and $9 shirts, each comes to $21.08 — $506.00 in total.",
    assumptions: "Shops charge roughly $0.75–$2 per 1,000 stitches, less for large orders, often with a minimum per item. Digitizing (converting artwork to a stitch file) is charged once and reused for reorders.",
    faq: [
      { question: "How much does embroidery cost per shirt?", answer: "Typically $6–$15 for a left-chest logo on top of the garment, depending on stitch count and quantity." },
      { question: "What is a digitizing fee?", answer: "A one-time charge, often $30–$75, to turn your logo into a file the embroidery machine can stitch." },
    ],
  },
  {
    slug: "laser-engraving-price-calculator",
    title: "Laser Engraving Price Calculator",
    description: "Price laser engraving and cutting jobs from the material, engraving time and setup at your machine rate, any design fee and markup — per item and per order.",
    metaTitle: "Laser Engraving Price Calculator — Price a Job",
    metaDescription: "Free laser engraving price calculator. Price engraved and laser-cut items from material, engraving minutes, setup, machine rate and markup.",
    calcInputs: [
      numberField("quantity", "Quantity", { default: 20, min: 1, max: 100000 }),
      currencyField("materialCost", "Material / Blank Cost Each", { default: 3.5, max: 10000, step: 0.05 }),
      numberField("engraveMinutes", "Engraving Time Each", { unit: "minutes", default: 6, max: 600, step: 0.5 }),
      numberField("setupMinutes", "Setup Time for the Job", { unit: "minutes", default: 20, max: 600, step: 5, required: false }),
      currencyField("machineRate", "Machine & Labor Rate per Hour", { default: 60, max: 500, step: 1 }),
      currencyField("designFee", "Design Fee", { default: 15, max: 1000, step: 5, required: false }),
      percentField("markup", "Markup", { default: 30, max: 300, step: 1 }),
    ],
    calcResult: { label: "Price per Item", format: "currency" },
    calcResults: [
      { key: "pricePerItem", label: "Price per Item", format: "currency", highlight: true },
      { key: "orderTotal", label: "Order Total", format: "currency" },
      { key: "costPerItem", label: "Cost per Item", format: "currency" },
      { key: "machineTimeCost", label: "Machine Time Cost", format: "currency" },
      { key: "profit", label: "Profit", format: "currency" },
    ],
    instructions:
      "Enter the quantity, the blank or material cost, engraving time per item and the job's setup time. Your machine rate should cover the laser, power, maintenance and your time. Add any design fee and markup.",
    examples: "Example: 20 engraved coasters with $3.50 blanks, 6 minutes each, 20 minutes of setup at $60 an hour, a $15 design fee and 30% markup: $14.63 each, $292.50 for the order.",
    assumptions: "Laser shop rates commonly run $60–$150 an hour of machine time, with a minimum order charge. Engraving time depends on area, resolution and speed; vector cutting is usually faster than raster engraving.",
    faq: [
      { question: "How much does laser engraving cost?", answer: "Shops often charge $60–$150 per hour of machine time plus materials, or $5–$25 per small item." },
      { question: "How do I price laser-engraved products?", answer: "Add material, machine time at an hourly rate, setup spread over the batch and any design time, then add 20–50% profit." },
    ],
  },
  {
    slug: "3d-print-price-calculator",
    title: "3D Print Price Calculator",
    description: "Price 3D prints from filament used (grams and cost per kg), print time at a machine rate, failed prints, post-processing and markup — plus the filament cost alone.",
    metaTitle: "3D Print Price Calculator — Filament & Print Cost",
    metaDescription: "Free 3D print price calculator. Work out filament cost, machine time, failure rate, post-processing and markup to price a 3D print.",
    calcInputs: [
      numberField("grams", "Filament Used", { unit: "g", default: 120, max: 100000, step: 1 }),
      currencyField("costPerKg", "Filament Cost per Kg", { default: 22, max: 500, step: 0.5 }),
      numberField("printHours", "Print Time", { unit: "hours", default: 8, max: 500, step: 0.25 }),
      currencyField("machineRate", "Machine Rate per Hour (Power, Wear, Depreciation)", { default: 0.6, max: 50, step: 0.05 }),
      percentField("failureRate", "Failed Print Allowance", { default: 10, max: 50, step: 1, required: false }),
      numberField("postMinutes", "Post-Processing Time", { unit: "minutes", default: 20, max: 600, step: 5, required: false }),
      currencyField("laborRate", "Labor Rate per Hour", { default: 20, max: 200, step: 1, required: false }),
      percentField("markup", "Markup", { default: 50, max: 500, step: 5 }),
    ],
    calcResult: { label: "Print Price", format: "currency" },
    calcResults: [
      { key: "printPrice", label: "Price to Charge", format: "currency", highlight: true },
      { key: "filamentCost", label: "Filament Cost", format: "currency" },
      { key: "machineCost", label: "Machine Time Cost", format: "currency" },
      { key: "costWithFailures", label: "Total Cost (With Failures & Labor)", format: "currency" },
      { key: "profit", label: "Profit", format: "currency" },
    ],
    instructions:
      "Enter the grams of filament from your slicer and the price per kilogram, the print time and a machine rate covering electricity, nozzle and part wear and the printer's cost over its life. Add a failure allowance, post-processing time (support removal, sanding) and markup.",
    examples: "Example: a 120 g print with $22/kg filament uses $2.64 of material. Eight hours at $0.60 an hour, a 10% failure allowance and 20 minutes of finishing bring the cost to $14.93; at 50% markup, charge $22.40.",
    assumptions: "Filament cost = grams ÷ 1,000 × price per kg. A typical desktop printer uses about 0.1–0.3 kWh per hour; with depreciation, $0.30–$1 per hour is a common machine rate. Resin printing uses ml of resin instead — enter it as grams at a similar cost per kg.",
    faq: [
      { question: "How much does a 3D print cost to make?", answer: "Material is often only $1–$5 for a small part; machine time, failed prints and finishing usually cost more." },
      { question: "How do I calculate filament cost?", answer: "Multiply the grams used by the spool price per kilogram and divide by 1,000. A 120 g print from a $22 spool costs $2.64." },
    ],
  },
  {
    slug: "pcb-assembly-cost-calculator",
    title: "PCB Assembly Cost Calculator",
    description: "Estimate PCB assembly cost per board and per order from bare boards, components, SMT placements, through-hole joints, setup and stencil fees.",
    metaTitle: "PCB Assembly Cost Calculator — Cost per Board",
    metaDescription: "Free PCB assembly cost calculator. Estimate cost per board from bare PCB, components, SMT placements, through-hole joints and setup fees.",
    calcInputs: [
      numberField("boards", "Number of Boards", { default: 100, min: 1, max: 1000000 }),
      currencyField("barePcbCost", "Bare PCB Cost per Board", { default: 1.8, max: 1000, step: 0.05 }),
      currencyField("componentsPerBoard", "Components (BOM) per Board", { default: 12.5, max: 10000, step: 0.1 }),
      numberField("smtPlacements", "SMT Placements per Board", { default: 120, max: 10000 }),
      currencyField("costPerPlacement", "Cost per SMT Placement", { default: 0.02, max: 1, step: 0.001 }),
      numberField("throughHoleJoints", "Through-Hole Solder Joints per Board", { default: 20, max: 10000, required: false }),
      currencyField("costPerJoint", "Cost per Through-Hole Joint", { default: 0.05, max: 1, step: 0.005, required: false }),
      currencyField("setupFee", "Setup / Programming Fee", { default: 150, max: 10000, step: 5, required: false }),
      currencyField("stencilFee", "Stencil Fee", { default: 40, max: 1000, step: 5, required: false }),
    ],
    calcResult: { label: "Cost per Board", format: "currency" },
    calcResults: [
      { key: "costPerBoard", label: "Cost per Board", format: "currency", highlight: true },
      { key: "orderTotal", label: "Order Total", format: "currency" },
      { key: "assemblyPerBoard", label: "Assembly Labor per Board", format: "currency" },
      { key: "setupPerBoard", label: "Setup & Stencil per Board", format: "currency" },
      { key: "componentsShare", label: "Components as % of Total", format: "percentage" },
    ],
    instructions:
      "Enter the number of boards, the bare PCB price and the component (BOM) cost per board. Count the SMT placements and through-hole joints per board and enter your assembler's rates, then the one-time setup and stencil fees.",
    examples: "Example: 100 boards with $1.80 PCBs, $12.50 of parts, 120 SMT placements at 2¢ and 20 through-hole joints at 5¢, plus $190 of setup, cost $19.60 a board — $1,960.00 for the run.",
    assumptions: "Assembly is often quoted per placement or per joint; setup, programming and stencils are one-time per design. Components usually dominate cost; parts shortages and minimum order quantities can raise it. Testing, conformal coating and shipping aren't included.",
    faq: [
      { question: "How much does PCB assembly cost?", answer: "For small runs, assembly often adds $2–$10 per board on top of parts, plus a few hundred dollars of setup per order." },
      { question: "Why are prototype PCB runs expensive per board?", answer: "Setup, programming and stencil costs are spread over only a few boards." },
    ],
  },
  {
    slug: "vinyl-decal-pricing-calculator",
    title: "Vinyl Decal Pricing Calculator",
    description: "Price vinyl decals and stickers from the vinyl and transfer tape used by square inch, waste, weeding and application time, with a minimum price and markup.",
    metaTitle: "Vinyl Decal Pricing Calculator — Price Decals",
    metaDescription: "Free vinyl decal pricing calculator. Price decals from size, vinyl and transfer tape cost per square inch, weeding time, markup and minimums.",
    calcInputs: [
      numberField("widthIn", "Decal Width", { unit: "in", default: 6, max: 120, step: 0.5 }),
      numberField("heightIn", "Decal Height", { unit: "in", default: 4, max: 120, step: 0.5 }),
      numberField("quantity", "Quantity", { default: 10, min: 1, max: 100000 }),
      currencyField("vinylPerSqIn", "Vinyl Cost per Sq In", { default: 0.012, max: 1, step: 0.001 }),
      currencyField("tapePerSqIn", "Transfer Tape per Sq In", { default: 0.005, max: 1, step: 0.001, required: false }),
      percentField("wastePercent", "Waste Around the Design", { default: 25, max: 100, step: 5 }),
      numberField("minutesEach", "Weeding & Masking Time Each", { unit: "minutes", default: 5, max: 120, step: 0.5 }),
      currencyField("hourlyRate", "Your Hourly Rate", { default: 18, max: 200, step: 1 }),
      percentField("markup", "Markup", { default: 100, max: 500, step: 5 }),
      currencyField("minimumPrice", "Minimum Price per Decal", { default: 4, max: 100, step: 0.5, required: false }),
    ],
    calcResult: { label: "Price per Decal", format: "currency" },
    calcResults: [
      { key: "pricePerDecal", label: "Price per Decal", format: "currency", highlight: true },
      { key: "orderTotal", label: "Order Total", format: "currency" },
      { key: "costPerDecal", label: "Cost per Decal", format: "currency" },
      { key: "materialPerDecal", label: "Material per Decal", format: "currency" },
      { key: "profitPerDecal", label: "Profit per Decal", format: "currency" },
    ],
    instructions:
      "Enter the decal size and quantity, your vinyl and transfer tape cost per square inch (roll price ÷ roll area) and a waste allowance. Add weeding and masking time, your hourly rate, markup and minimum price.",
    examples: "Example: a 6 × 4 in decal uses $0.51 of vinyl and tape; with 5 minutes of weeding at $18 an hour and 100% markup, sell it for $4.02 — $40.20 for 10.",
    assumptions: "Vinyl cost per sq in = roll price ÷ (width × length in inches). Detailed lettering takes far longer to weed than simple shapes. Car and wall decals often sell for $5–$25 depending on size.",
    faq: [
      { question: "How much should I charge for vinyl decals?", answer: "Many sellers charge $3–$8 for small decals and $10–$25+ for large ones, covering vinyl, tape, weeding time and profit." },
      { question: "How do I work out vinyl cost per square inch?", answer: "Divide the roll price by its area in square inches. A $12 roll of 12 in × 5 ft (720 sq in) costs about 1.7¢ per sq in." },
    ],
  },
  {
    slug: "vinyl-sign-pricing-calculator",
    title: "Vinyl Sign Pricing Calculator",
    description: "Price vinyl-lettered signs on coroplast, PVC, aluminum or magnetic sheet — substrate by square foot, vinyl coverage, labor and markup — per sign and per order.",
    metaTitle: "Vinyl Sign Pricing Calculator — Price a Sign",
    metaDescription: "Free vinyl sign pricing calculator. Price coroplast, PVC, aluminum and magnetic signs from size, vinyl coverage, labor and markup.",
    calcInputs: [
      numberField("widthIn", "Sign Width", { unit: "in", default: 24, max: 240 }),
      numberField("heightIn", "Sign Height", { unit: "in", default: 18, max: 240 }),
      dropdown("substrate", "Material", [["Coroplast — about $2.50/sq ft", 0], ["PVC board — about $5/sq ft", 1], ["Aluminum composite (ACM) — about $9/sq ft", 2], ["Magnetic sheet — about $6/sq ft", 3]], 0),
      percentField("coverage", "Vinyl Coverage of the Sign", { default: 40, max: 100, step: 5 }),
      currencyField("vinylPerSqFt", "Vinyl Cost per Sq Ft", { default: 1.5, max: 50, step: 0.05 }),
      numberField("minutesEach", "Labor per Sign (Cut, Weed, Apply)", { unit: "minutes", default: 25, max: 600, step: 5 }),
      currencyField("hourlyRate", "Labor Rate per Hour", { default: 30, max: 200, step: 1 }),
      percentField("markup", "Markup", { default: 80, max: 400, step: 5 }),
      numberField("quantity", "Quantity", { default: 10, min: 1, max: 10000 }),
      currencyField("designFee", "Design Fee per Order", { default: 35, max: 1000, step: 5, required: false }),
    ],
    calcResult: { label: "Price per Sign", format: "currency" },
    calcResults: [
      { key: "pricePerSign", label: "Price per Sign", format: "currency", highlight: true },
      { key: "orderTotal", label: "Order Total (With Design)", format: "currency" },
      { key: "costPerSign", label: "Cost per Sign", format: "currency" },
      { key: "squareFeet", label: "Square Feet", format: "number" },
      { key: "profitPerSign", label: "Profit per Sign", format: "currency" },
    ],
    instructions:
      "Enter the sign size and material, how much of the face is covered in vinyl and your vinyl cost per square foot. Add labor time, rate, markup, quantity and any design fee.",
    examples: "Example: ten 24 × 18 in coroplast yard signs with 40% vinyl coverage and 25 minutes of labor at $30 an hour, marked up 80%, sell for $39.24 each — $427.40 with design.",
    assumptions: "Substrate prices are typical sheet costs per square foot including waste. Printed (full-colour) signs use printed vinyl or direct UV printing instead and are priced by square foot of print. Installation and stakes or hardware are extra.",
    faq: [
      { question: "How much do vinyl yard signs cost?", answer: "Typically $15–$40 each for 18 × 24 in coroplast signs in small quantities, less for bulk orders." },
      { question: "Which sign material lasts longest outdoors?", answer: "Aluminum composite lasts years; coroplast suits short-term signs of a few months to a year." },
    ],
  },
  {
    slug: "sign-price-calculator",
    title: "Sign Price Calculator",
    description: "Estimate what a business sign costs — yard signs, banners, sidewalk A-frames, metal panels, dimensional letters, lightboxes and monument signs — by size, with installation and permits.",
    metaTitle: "Sign Price Calculator — Business Sign Cost",
    metaDescription: "Free sign price calculator. Estimate the cost of business signs by type and size — banners, A-frames, lightboxes, monument signs — plus install.",
    calcInputs: [
      dropdown("signType", "Sign Type", [["Yard sign — about $8/sq ft", 0], ["Vinyl banner — about $6/sq ft", 1], ["A-frame / sidewalk sign — about $25/sq ft", 2], ["Aluminum / metal panel — about $20/sq ft", 3], ["Dimensional letters (non-lit) — about $45/sq ft", 4], ["Lightbox / cabinet sign — about $75/sq ft", 5], ["Monument sign — about $120/sq ft", 6]], 5),
      numberField("widthFt", "Width", { unit: "ft", default: 8, max: 100, step: 0.5 }),
      numberField("heightFt", "Height", { unit: "ft", default: 3, max: 50, step: 0.5 }),
      numberField("quantity", "Quantity", { default: 1, min: 1, max: 1000 }),
      currencyField("installation", "Installation", { default: 800, max: 100000, step: 50, required: false }),
      currencyField("designFee", "Design Fee", { default: 150, max: 10000, step: 25, required: false }),
      currencyField("permitFee", "Sign Permit", { default: 250, max: 10000, step: 25, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "signCostEach", label: "Sign Cost Each", format: "currency" },
      { key: "squareFeet", label: "Square Feet Each", format: "number" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions:
      "Choose the type of sign and enter its size and quantity. Add installation, design and permit costs — illuminated and permanent signs usually need a permit and an electrician.",
    examples: "Example: an 8 × 3 ft lightbox sign is about $1,800.00; with installation, design and a permit the estimate is $3,000.00, likely between $2,250.00 and $4,050.00.",
    assumptions: "Rates are typical US sign-shop prices per square foot, with minimums for small signs. Custom shapes, LED upgrades, double-sided faces and difficult installs cost more. Get two or three quotes for permanent signs.",
    faq: [
      { question: "How much does a business sign cost?", answer: "From under $100 for a yard sign or banner to $2,000–$8,000 for an illuminated storefront sign and $10,000+ for a monument sign." },
      { question: "Do I need a permit for a business sign?", answer: "Most cities require a permit for permanent exterior signs, especially illuminated or freestanding ones." },
    ],
  },
  {
    slug: "channel-letter-sign-price-calculator",
    title: "Channel Letter Sign Price Calculator",
    description: "Estimate the cost of channel letter signs from the number of letters and letter height, illumination type (front-lit, halo-lit or non-lit), raceway, installation and permit.",
    metaTitle: "Channel Letter Sign Price Calculator — Cost",
    metaDescription: "Free channel letter sign price calculator. Estimate storefront letter sign costs by letter count and height, lighting type, raceway and install.",
    calcInputs: [
      numberField("letters", "Number of Letters", { default: 12, max: 200 }),
      numberField("letterHeightIn", "Letter Height", { unit: "in", default: 24, max: 120, step: 1 }),
      currencyField("pricePerInch", "Price per Inch of Letter Height (Front-Lit)", { default: 13, max: 100, step: 0.5 }),
      dropdown("illumination", "Illumination", [["Front-lit", 0], ["Back-lit (halo)", 1], ["Front & back lit", 2], ["Non-illuminated", 3]], 0),
      numberField("racewayFt", "Raceway Length", { unit: "ft", default: 18, max: 200, required: false }),
      currencyField("racewayPerFt", "Raceway per Foot", { default: 45, max: 500, step: 1, required: false }),
      currencyField("installation", "Installation & Electrical", { default: 1200, max: 50000, step: 50, required: false }),
      currencyField("permitFee", "Permit", { default: 350, max: 10000, step: 25, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "lettersCost", label: "Letters", format: "currency" },
      { key: "racewayCost", label: "Raceway", format: "currency" },
      { key: "costPerLetter", label: "Cost per Letter", format: "currency" },
      { key: "costPerLetterInch", label: "Cost per Letter-Inch", format: "currency" },
    ],
    instructions:
      "Enter the number of letters (don't count spaces) and their height, and a price per inch of letter height from local quotes ($10–$20 is common for front-lit). Choose the illumination, then raceway length, installation and permit.",
    examples: "Example: 12 front-lit letters 24 inches tall at $13 per inch cost $3,744.00. With an 18 ft raceway, installation and permit, the sign is about $6,104.00.",
    assumptions: "Channel letters are commonly priced per inch of letter height per letter; halo-lit letters cost about 25% more and non-illuminated about 40% less. Logos and custom shapes are priced separately. Prices include LED lighting but not ongoing electricity.",
    faq: [
      { question: "How much do channel letter signs cost?", answer: "Often $10–$20 per inch of letter height per letter, so a 12-letter, 24-inch front-lit sign is roughly $3,000–$6,000 before installation." },
      { question: "What is a raceway?", answer: "A metal box mounted on the wall that holds the letters' wiring and power supplies, so fewer holes go into the building." },
    ],
  },
  {
    slug: "picture-framing-cost-calculator",
    title: "Picture Framing Cost Calculator",
    description: "Estimate custom picture framing cost from the art size, mat width, moulding price per united inch, glazing type, mounting and labor.",
    metaTitle: "Picture Framing Cost Calculator — Custom Frame",
    metaDescription: "Free picture framing cost calculator. Estimate custom framing from art size, mat, moulding per united inch, glass type, mounting and labor.",
    calcInputs: [
      numberField("artWidthIn", "Art Width", { unit: "in", default: 16, max: 120, step: 0.5 }),
      numberField("artHeightIn", "Art Height", { unit: "in", default: 20, max: 120, step: 0.5 }),
      numberField("matWidthIn", "Mat Border Width (0 = No Mat)", { unit: "in", default: 2.5, max: 10, step: 0.25, required: false }),
      currencyField("mouldingPerUnitedInch", "Moulding Price per United Inch", { default: 2.5, max: 50, step: 0.1 }),
      dropdown("glazing", "Glazing", [["Regular glass or acrylic", 0], ["UV-protective (conservation)", 1], ["Museum glass (anti-reflective + UV)", 2]], 1),
      currencyField("matPerSqIn", "Mat Board per Sq In", { default: 0.06, max: 1, step: 0.005, required: false }),
      currencyField("mounting", "Mounting / Backing", { default: 20, max: 500, step: 1, required: false }),
      currencyField("labor", "Labor / Fitting", { default: 30, max: 500, step: 1, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Framing Cost", format: "currency", highlight: true },
      { key: "mouldingCost", label: "Moulding (Frame)", format: "currency" },
      { key: "glazingCost", label: "Glazing", format: "currency" },
      { key: "matCost", label: "Mat", format: "currency" },
      { key: "unitedInches", label: "United Inches", format: "number" },
      { key: "framedSize", label: "Framed Area (sq in)", format: "number" },
    ],
    instructions:
      "Enter the art's width and height and the mat border width. Framers price moulding by the united inch (width + height of the framed piece) — enter the rate for the frame you like. Choose the glazing and add mounting and labor.",
    examples: "Example: a 16 × 20 in print with a 2.5 in mat is 21 × 25 in framed — 46 united inches. At $2.50 per united inch with UV glass, mat, mounting and labor, framing costs about $209.63.",
    assumptions: "Moulding commonly runs $1.50–$6+ per united inch at frame shops; glazing per square inch rises from regular to UV to museum glass. Shops often have minimums and charge more for oversized pieces, shadow boxes and canvas stretching.",
    faq: [
      { question: "How much does custom framing cost?", answer: "A 16 × 20 in piece usually costs $150–$400 with a mat and UV glass, depending on the moulding." },
      { question: "What are united inches?", answer: "The width plus the height of the framed piece, used by framers to price moulding, glass and mats." },
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
