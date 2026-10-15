// One-time (but safe to re-run) batch setup script: creates 11 outdoor cost tools
// from the user's shopping list (Shopping Calculators > Home Improvement Cost & Sizing Calculators).
// See src/lib/calc-engine-shopping-home-cost-outdoor.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-home-cost-outdoor-calculators.ts
// or
//   npm run db:create-shopping-home-cost-outdoor-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Home Improvement Cost & Sizing Calculators", slug: "home-improvement-cost-sizing-calculators" };

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

const REGION_NOTE = "Prices are 2026 US national averages; use the regional factor (for example 120% in high-cost metros or 85% in low-cost areas) and get at least three quotes.";

const TOOLS: ToolDef[] = [
  {
    slug: "pool-cost-calculator",
    title: "Pool Cost Calculator",
    description: "Estimate inground pool cost by size and type — vinyl liner, fiberglass or concrete — with site conditions, excavation, decking, fencing and permits.",
    metaTitle: "Pool Cost Calculator — 2026 Prices",
    metaDescription: "Free pool cost calculator. Estimate pool cost by sq ft of pool surface and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Pool Surface Area", { unit: "sq ft", default: 512, max: 3000, step: 1 }),
      dropdown("tier", "Option", [["Vinyl liner inground", 0], ["Fiberglass inground", 1], ["Concrete / gunite", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Easy access, normal soil", 1], ["Tight access / clay", 1.15], ["Rock or slope", 1.35]], 1),
      currencyField("removalPerUnit", "Excavation Haul-Away per sq ft", { default: 5, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Decking, Fence & Permits", { default: 15000, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Sq ft of pool surface (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the pool surface area and choose the option you want. Then pick the job complexity, add the cost of excavation haul-away and include decking, fence & permits.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 512 sq ft with the fiberglass inground option (tight access / clay) comes to about $79,000.00 — $154.30 per sq ft of pool surface including extras — with typical quotes between $67,150.00 and $94,800.00.",
    assumptions: "Typical 2026 installed costs for a 16 × 32 ft pool: vinyl $45,000–$65,000, fiberglass $55,000–$85,000, concrete $70,000–$120,000 before extras. Heaters, lighting, automation and landscaping add more. Yearly upkeep is $1,500–$4,000." + " " + REGION_NOTE,
    faq: [
      { question: "How much does an inground pool cost?", answer: "Most cost $50,000–$100,000 installed with basic decking, depending on type and site." },
      { question: "Which pool type is cheapest long-term?", answer: "Fiberglass costs more upfront than vinyl but needs no liner replacements and less chemical use." },
    ],
  },
  {
    slug: "pool-screen-enclosure-cost-calculator",
    title: "Pool Screen Enclosure Cost Calculator",
    description: "Estimate pool screen enclosure (pool cage) cost by enclosed area — standard, mansard or dome, or insulated-roof lanai — with height and permits.",
    metaTitle: "Pool Screen Enclosure Cost Calculator — 2026 Prices",
    metaDescription: "Free pool screen enclosure cost calculator. Estimate pool screen enclosure cost by sq ft enclosed and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Enclosed Area", { unit: "sq ft", default: 1000, max: 10000, step: 1 }),
      dropdown("tier", "Option", [["Standard screen enclosure", 0], ["Mansard / dome style", 1], ["Insulated roof / lanai", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Standard height", 1], ["Two-story height", 1.1], ["Complex shape", 1.25]], 1),
      currencyField("removalPerUnit", "Old Screen Removal per sq ft", { default: 1, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Permits & Engineering", { default: 800, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Sq ft enclosed (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the enclosed area and choose the option you want. Then pick the job complexity, add the cost of old screen removal and include permits & engineering.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 1,000 sq ft with the mansard / dome style option (two-story height) comes to about $16,800.00 — $16.80 per sq ft enclosed including extras — with typical quotes between $14,280.00 and $20,160.00.",
    assumptions: "Typical 2026 prices: $10–$15 per sq ft for standard aluminum enclosures, $15–$20 for mansard and dome styles, $25+ with solid insulated roofs. Rescreening an existing cage costs $2–$4 per sq ft. Hurricane-rated designs cost more." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a pool enclosure cost?", answer: "About $10,000–$20,000 for a typical screened pool cage of around 1,000 sq ft." },
      { question: "How much does it cost to rescreen a pool cage?", answer: "Roughly $2–$4 per square foot, or $2,500–$5,000 for an average cage." },
    ],
  },
  {
    slug: "pool-cover-cost-calculator",
    title: "Pool Cover Cost Calculator",
    description: "Estimate pool cover cost by pool size — mesh safety, solid safety or automatic covers — with shape complexity.",
    metaTitle: "Pool Cover Cost Calculator — 2026 Prices",
    metaDescription: "Free pool cover cost calculator. Estimate pool cover cost by sq ft of pool and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Pool Surface Area", { unit: "sq ft", default: 512, max: 3000, step: 1 }),
      dropdown("tier", "Option", [["Mesh safety cover", 0], ["Solid safety cover", 1], ["Automatic cover", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Rectangle", 1], ["Freeform", 1.15], ["Raised walls / water features", 1.3]], 1),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Sq ft of pool (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the pool surface area and choose the option you want. Then pick the job complexity.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 512 sq ft with the solid safety cover option (freeform) comes to about $2,816.00 — $5.50 per sq ft of pool including extras — with typical quotes between $2,393.60 and $3,379.20.",
    assumptions: "Typical 2026 installed prices for a 16 × 32 ft pool: mesh safety $1,800–$3,000, solid safety $2,500–$4,000, automatic $12,000–$20,000. Solar blankets cost a few hundred dollars but aren't safety covers." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a pool safety cover cost?", answer: "About $2,000–$4,000 installed for a typical inground pool." },
      { question: "Are automatic pool covers worth it?", answer: "They're costly but add safety, cut evaporation and heating costs, and are easy to use daily." },
    ],
  },
  {
    slug: "pool-liner-cost-calculator",
    title: "Pool Liner Cost Calculator",
    description: "Estimate vinyl pool liner replacement cost by liner area and thickness — 20, 27 or 30 mil — with shape, removal and refill.",
    metaTitle: "Pool Liner Cost Calculator — 2026 Prices",
    metaDescription: "Free pool liner cost calculator. Estimate pool liner cost by sq ft of liner and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Liner Area (Floor + Walls)", { unit: "sq ft", default: 800, max: 5000, step: 1 }),
      dropdown("tier", "Option", [["20 mil", 0], ["27 mil", 1], ["30 mil premium pattern", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Rectangle", 1], ["Freeform", 1.15], ["Steps / repairs needed", 1.3]], 1),
      currencyField("removalPerUnit", "Old Liner Removal per sq ft", { default: 0.3, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Water Refill", { default: 400, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Sq ft of liner (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the liner area (floor + walls) and choose the option you want. Then pick the job complexity, add the cost of old liner removal and include water refill.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 800 sq ft with the 27 mil option (freeform) comes to about $4,240.00 — $5.30 per sq ft of liner including extras — with typical quotes between $3,604.00 and $5,088.00.",
    assumptions: "Typical 2026 installed prices: $3,500–$6,500 for an inground liner. Liner area ≈ floor area + perimeter × average depth. Liners usually last 7–12 years. Above-ground liners cost far less." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a pool liner replacement cost?", answer: "Usually $3,500–$6,500 for an inground pool, including installation and water." },
      { question: "Is a thicker pool liner better?", answer: "Thicker liners (27–30 mil) resist punctures better but can be harder to fit in complex shapes." },
    ],
  },
  {
    slug: "hot-tub-cost-calculator",
    title: "Hot Tub Cost Calculator",
    description: "Estimate hot tub cost — inflatable, plug-and-play or premium 240 V spas — with installation, electrical, pad, delivery and old tub removal.",
    metaTitle: "Hot Tub Cost Calculator — 2026 Prices",
    metaDescription: "Free hot tub cost calculator. Estimate hot tub cost by hot tub and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Number of Hot Tubs", { unit: "hot tubs", default: 1, max: 3, step: 0.5 }),
      dropdown("tier", "Option", [["Inflatable / soft-sided", 0], ["Plug-and-play (110 V)", 1], ["Premium 6–8 person (240 V)", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Ready pad nearby", 1], ["Deck reinforcement", 1.1], ["Crane or difficult access", 1.3]], 1),
      currencyField("removalPerUnit", "Old Tub Removal (Each)", { default: 400, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "240 V Electrical & Pad", { default: 2500, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Hot tub (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the number of hot tubs and choose the option you want. Then pick the job complexity, add the cost of old tub removal (each) and include 240 v electrical & pad.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 1 hot tubs with the plug-and-play (110 v) option (deck reinforcement) comes to about $7,900.00 — $7,900.00 per hot tub including extras — with typical quotes between $6,715.00 and $9,480.00.",
    assumptions: "Typical 2026 costs: inflatables $500–$1,000, plug-and-play $4,000–$7,000, premium spas $8,000–$15,000+ plus $1,500–$4,000 for electrical and a pad. Running costs are about $25–$60 a month." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a hot tub cost?", answer: "Most mid-range hot tubs cost $6,000–$12,000 plus installation." },
      { question: "How much does it cost to run a hot tub?", answer: "Typically $25–$60 a month for electricity, more in cold climates or with a poor cover." },
    ],
  },
  {
    slug: "sprinkler-system-cost-calculator",
    title: "Sprinkler System Cost Calculator",
    description: "Estimate lawn sprinkler (irrigation) system cost by area — basic spray zones, smart controllers with drip, or premium rotors — with terrain and backflow.",
    metaTitle: "Sprinkler System Cost Calculator — 2026 Prices",
    metaDescription: "Free sprinkler system cost calculator. Estimate sprinkler system cost by sq ft of lawn and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Area to Irrigate", { unit: "sq ft", default: 5000, max: 100000, step: 1 }),
      dropdown("tier", "Option", [["Basic spray zones", 0], ["Smart controller with drip beds", 1], ["Premium rotors & drip", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Easy / standard", 1], ["Moderate", 1.15], ["Difficult", 1.3]], 1),
      currencyField("fixedCosts", "Backflow Preventer & Permit", { default: 400, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Sq ft of lawn (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the area to irrigate and choose the option you want. Then pick the job complexity and include backflow preventer & permit.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 5,000 sq ft with the smart controller with drip beds option (moderate) comes to about $4,900.00 — $0.98 per sq ft of lawn including extras — with typical quotes between $4,165.00 and $5,880.00.",
    assumptions: "Typical 2026 installed prices: $0.50–$1.50 per sq ft, or $2,500–$6,000 for a typical yard. Smart controllers can cut water use 20–40%. Many areas require a backflow preventer and inspection." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a sprinkler system cost?", answer: "Usually $2,500–$6,000 for a quarter-acre yard." },
      { question: "How many sprinkler zones do I need?", answer: "Roughly one zone per 1,000–1,500 sq ft of lawn, plus separate drip zones for beds." },
    ],
  },
  {
    slug: "outdoor-kitchen-cost-calculator",
    title: "Outdoor Kitchen Cost Calculator",
    description: "Estimate outdoor kitchen cost by counter length — prefab island, masonry with grill, or luxury with appliances — with gas, electric and water.",
    metaTitle: "Outdoor Kitchen Cost Calculator — 2026 Prices",
    metaDescription: "Free outdoor kitchen cost calculator. Estimate outdoor kitchen cost by linear ft of counter and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Counter Length", { unit: "linear ft", default: 12, max: 60, step: 0.5 }),
      dropdown("tier", "Option", [["Basic prefab island", 0], ["Masonry island with grill", 1], ["Luxury with appliances", 2]], 1),
      dropdown("complexity", "Job Complexity", [["No utilities", 1], ["Gas line", 1.15], ["Gas, electric & water", 1.35]], 1),
      currencyField("fixedCosts", "Gas & Electric Runs", { default: 1500, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Linear ft of counter (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the counter length and choose the option you want. Then pick the job complexity and include gas & electric runs.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 12 linear ft with the masonry island with grill option (gas line) comes to about $15,900.00 — $1,325.00 per linear ft of counter including extras — with typical quotes between $13,515.00 and $19,080.00.",
    assumptions: "Typical 2026 costs: $5,000–$10,000 for a basic grill island, $15,000–$25,000 for a masonry kitchen, $30,000–$60,000+ for luxury builds with refrigerators, pizza ovens and covers." + " " + REGION_NOTE,
    faq: [
      { question: "How much does an outdoor kitchen cost?", answer: "Most cost $10,000–$30,000; simple grill islands start around $5,000." },
      { question: "What is the most expensive part of an outdoor kitchen?", answer: "Appliances (grill, refrigerator, pizza oven) and running gas, electric and water." },
    ],
  },
  {
    slug: "patio-cost-calculator",
    title: "Patio Cost Calculator",
    description: "Compare patio costs by area and material — concrete, pavers or flagstone — with grading and old patio removal.",
    metaTitle: "Patio Cost Calculator — 2026 Prices",
    metaDescription: "Free patio cost calculator. Estimate patio cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Patio Area", { unit: "sq ft", default: 300, max: 5000, step: 1 }),
      dropdown("tier", "Option", [["Concrete", 0], ["Pavers", 1], ["Flagstone / natural stone", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Flat ground", 1], ["Some grading", 1.1], ["Slope / retaining needed", 1.25]], 1),
      currencyField("removalPerUnit", "Old Patio Removal per sq ft", { default: 3, max: 100000, step: 0.05, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Sq ft (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the patio area and choose the option you want. Then pick the job complexity and add the cost of old patio removal.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 300 sq ft with the pavers option (some grading) comes to about $6,900.00 — $23.00 per sq ft including extras — with typical quotes between $5,865.00 and $8,280.00.",
    assumptions: "Typical 2026 installed prices: concrete $8–$15, pavers $15–$25, natural stone $25–$40 per sq ft. Steps, seat walls and fire pits add cost. Good base preparation prevents settling." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a patio cost?", answer: "About $10–$30 per square foot, so a 300 sq ft patio is $3,000–$9,000." },
      { question: "What is the cheapest patio material?", answer: "Plain concrete, followed by gravel and concrete pavers." },
    ],
  },
  {
    slug: "paver-cost-calculator",
    title: "Paver Cost Calculator",
    description: "Estimate paver patio, walkway or driveway cost by area and material — concrete, clay brick or natural stone — with pattern and removal.",
    metaTitle: "Paver Cost Calculator — 2026 Prices",
    metaDescription: "Free paver cost calculator. Estimate paver cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Paver Area", { unit: "sq ft", default: 300, max: 10000, step: 1 }),
      dropdown("tier", "Option", [["Concrete pavers", 0], ["Clay brick pavers", 1], ["Natural stone / travertine", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Simple pattern", 1], ["Herringbone / borders", 1.1], ["Curves & inlays", 1.2]], 1),
      currencyField("removalPerUnit", "Old Surface Removal per sq ft", { default: 3, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Edging & Base Upgrade", { default: 250, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Sq ft (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the paver area and choose the option you want. Then pick the job complexity, add the cost of old surface removal and include edging & base upgrade.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 300 sq ft with the clay brick pavers option (herringbone / borders) comes to about $7,150.00 — $23.83 per sq ft including extras — with typical quotes between $6,077.50 and $8,580.00.",
    assumptions: "Typical 2026 installed prices: concrete pavers $13–$20, brick $18–$25, natural stone $25–$35 per sq ft. Driveways need a thicker base. Add 5–10% extra pavers for cuts." + " " + REGION_NOTE,
    faq: [
      { question: "How much do pavers cost per square foot?", answer: "About $15–$30 installed depending on material and pattern." },
      { question: "Are pavers better than concrete?", answer: "Pavers cost more but resist cracking, are easy to repair and look more upscale." },
    ],
  },
  {
    slug: "pergola-cost-calculator",
    title: "Pergola Cost Calculator",
    description: "Estimate pergola cost by footprint and material — pressure-treated wood, cedar or vinyl, or aluminum louvered roofs — with footings and permits.",
    metaTitle: "Pergola Cost Calculator — 2026 Prices",
    metaDescription: "Free pergola cost calculator. Estimate pergola cost by sq ft of footprint and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Pergola Footprint", { unit: "sq ft", default: 144, max: 1000, step: 1 }),
      dropdown("tier", "Option", [["Pressure-treated wood", 0], ["Cedar or vinyl", 1], ["Aluminum louvered roof", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Freestanding, level", 1], ["Attached to house", 1.1], ["Custom / large span", 1.25]], 1),
      currencyField("fixedCosts", "Footings & Permit", { default: 600, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Sq ft of footprint (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the pergola footprint and choose the option you want. Then pick the job complexity and include footings & permit.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 144 sq ft with the cedar or vinyl option (attached to house) comes to about $7,800.00 — $54.17 per sq ft of footprint including extras — with typical quotes between $6,630.00 and $9,360.00.",
    assumptions: "Typical 2026 installed prices: $30–$50 per sq ft for wood, $45–$60 for cedar and vinyl, $80–$120 for louvered aluminum. A 12 × 12 ft wood pergola is about $4,000–$7,000." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a pergola cost?", answer: "About $4,000–$8,000 for a 12 × 12 ft wood pergola; louvered aluminum ones cost $12,000–$20,000." },
      { question: "Do I need a permit for a pergola?", answer: "Often yes if it's attached to the house or over a certain size — check local rules." },
    ],
  },
  {
    slug: "dock-cost-calculator",
    title: "Dock Cost Calculator",
    description: "Estimate boat dock cost by area and type — floating, fixed piling or composite and aluminum — with water depth, removal, permits and lifts.",
    metaTitle: "Dock Cost Calculator — 2026 Prices",
    metaDescription: "Free dock cost calculator. Estimate dock cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Dock Area", { unit: "sq ft", default: 200, max: 5000, step: 1 }),
      dropdown("tier", "Option", [["Floating wood dock", 0], ["Fixed piling wood dock", 1], ["Composite / aluminum", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Shallow, calm water", 1], ["Moderate depth", 1.2], ["Deep or rough water", 1.5]], 1),
      currencyField("removalPerUnit", "Old Dock Removal per sq ft", { default: 5, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Permits & Boat Lift", { default: 1500, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Sq ft (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the dock area and choose the option you want. Then pick the job complexity, add the cost of old dock removal and include permits & boat lift.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 200 sq ft with the fixed piling wood dock option (moderate depth) comes to about $15,500.00 — $77.50 per sq ft including extras — with typical quotes between $13,175.00 and $18,600.00.",
    assumptions: "Typical 2026 installed prices: floating docks $30–$50, fixed piling docks $45–$80, composite and aluminum $70–$100+ per sq ft. Boat lifts add $3,000–$15,000. Shoreline permits can take months." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a boat dock cost?", answer: "About $10,000–$25,000 for a typical residential dock, more with lifts and roofs." },
      { question: "Floating or fixed dock?", answer: "Floating docks suit changing water levels; fixed docks are steadier in shallow, stable water." },
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
