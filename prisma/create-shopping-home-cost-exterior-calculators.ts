// One-time (but safe to re-run) batch setup script: creates 12 exterior cost tools
// from the user's shopping list (Shopping Calculators > Home Improvement Cost & Sizing Calculators).
// See src/lib/calc-engine-shopping-home-cost-exterior.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-home-cost-exterior-calculators.ts
// or
//   npm run db:create-shopping-home-cost-exterior-calculators

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
    slug: "roof-replacement-cost-calculator",
    title: "Roof Replacement Cost Calculator",
    description: "Estimate the cost to replace a roof — asphalt, architectural shingles or metal — by roof area and pitch, with tear-off, permits and a price range.",
    metaTitle: "Roof Replacement Cost Calculator — 2026 Prices",
    metaDescription: "Free roof replacement cost calculator. Estimate roof replacement cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Roof Area", { unit: "sq ft", default: 2000, max: 20000, step: 1 }),
      dropdown("tier", "Option", [["Asphalt 3-tab shingles", 0], ["Architectural shingles", 1], ["Standing-seam metal", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Low pitch (walkable)", 1], ["Medium pitch", 1.15], ["Steep pitch", 1.35]], 1),
      currencyField("removalPerUnit", "Tear-Off of Old Roofing per sq ft", { default: 1.25, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Permits, Dumpster & Flashing", { default: 800, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the roof area and choose the option you want. Then pick the job complexity, add the cost of tear-off of old roofing and include permits, dumpster & flashing.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 2,000 sq ft with the architectural shingles option (medium pitch) comes to about $13,300.00 — $6.65 per sq ft including extras — with typical quotes between $11,305.00 and $15,960.00.",
    assumptions: "A roofing 'square' is 100 sq ft; roof area is usually 1.1–1.5× the house footprint depending on pitch. Typical 2026 installed prices: 3-tab $3.50–$5, architectural $4.50–$6.50, metal $9–$14 per sq ft. Second layers, rotten decking and skylights add cost." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a new roof cost?", answer: "Most asphalt shingle roofs on a typical home cost $9,000–$15,000; metal roofs often run $20,000–$30,000+." },
      { question: "How do I measure my roof area?", answer: "Multiply the house footprint (including overhangs) by a pitch factor — about 1.05 for low, 1.15 for medium and 1.4 for steep roofs." },
    ],
  },
  {
    slug: "fence-cost-calculator",
    title: "Fence Cost Calculator",
    description: "Estimate fence installation cost by length and material — chain link, wood or vinyl — with terrain, old fence removal, gates and permits.",
    metaTitle: "Fence Cost Calculator — 2026 Prices",
    metaDescription: "Free fence cost calculator. Estimate fence cost by linear ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Fence Length", { unit: "linear ft", default: 150, max: 5000, step: 1 }),
      dropdown("tier", "Option", [["Chain link (4 ft)", 0], ["Wood privacy (6 ft)", 1], ["Vinyl privacy (6 ft)", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Flat, easy ground", 1], ["Sloped yard", 1.1], ["Rocky or hard digging", 1.25]], 1),
      currencyField("removalPerUnit", "Old Fence Removal per ft", { default: 4, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Gates & Permit", { default: 600, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Linear ft (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the fence length and choose the option you want. Then pick the job complexity, add the cost of old fence removal and include gates & permit.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 150 linear ft with the wood privacy (6 ft) option (sloped yard) comes to about $6,000.00 — $40.00 per linear ft including extras — with typical quotes between $5,100.00 and $7,200.00.",
    assumptions: "Typical 2026 installed prices per linear foot: chain link $15–$25, wood privacy $25–$40, vinyl $30–$45, aluminum and wrought iron more. Each gate adds $300–$800. Call 811 before digging and check HOA and property-line rules." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a fence cost per foot?", answer: "Roughly $15–$45 per linear foot installed depending on material and height; wood privacy fences average about $30." },
      { question: "How do I measure for a fence?", answer: "Walk the planned line and add up each side in feet, then subtract driveway openings and add gates separately." },
    ],
  },
  {
    slug: "deck-cost-calculator",
    title: "Deck Cost Calculator",
    description: "Estimate deck building cost by size and material — pressure-treated, cedar or composite — with height, railings, stairs, removal and permits.",
    metaTitle: "Deck Cost Calculator — 2026 Prices",
    metaDescription: "Free deck cost calculator. Estimate deck cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Deck Area", { unit: "sq ft", default: 300, max: 5000, step: 1 }),
      dropdown("tier", "Option", [["Pressure-treated wood", 0], ["Cedar / redwood", 1], ["Composite", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Ground level", 1], ["Raised (2–8 ft)", 1.15], ["Second story", 1.35]], 1),
      currencyField("removalPerUnit", "Old Deck Removal per sq ft", { default: 5, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Railings, Stairs & Permit", { default: 2500, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the deck area and choose the option you want. Then pick the job complexity, add the cost of old deck removal and include railings, stairs & permit.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 300 sq ft with the cedar / redwood option (raised (2–8 ft)) comes to about $16,600.00 — $55.33 per sq ft including extras — with typical quotes between $14,110.00 and $19,920.00.",
    assumptions: "Typical 2026 prices: pressure-treated $25–$40, cedar $35–$50, composite $45–$70 per sq ft installed. Railings add $30–$80 per linear foot and stairs $100–$300 per step. Most decks need a permit." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a 12 × 12 deck cost?", answer: "About $4,000–$10,000 depending on material, height and railings." },
      { question: "Is composite decking worth the extra cost?", answer: "It costs more upfront but needs no staining and lasts 25+ years, so lifetime costs are often similar." },
    ],
  },
  {
    slug: "retaining-wall-cost-calculator",
    title: "Retaining Wall Cost Calculator",
    description: "Estimate retaining wall cost by face area and material — timber, concrete block or natural stone — with height, drainage and engineering.",
    metaTitle: "Retaining Wall Cost Calculator — 2026 Prices",
    metaDescription: "Free retaining wall cost calculator. Estimate retaining wall cost by sq ft of wall face and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Wall Face Area (Length × Height)", { unit: "sq ft", default: 200, max: 10000, step: 1 }),
      dropdown("tier", "Option", [["Timber", 0], ["Concrete block", 1], ["Natural stone", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Under 3 ft tall", 1], ["3–4 ft tall", 1.2], ["Over 4 ft (engineered)", 1.6]], 1),
      currencyField("removalPerUnit", "Excavation & Drainage per sq ft", { default: 8, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Permit / Engineering", { default: 300, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Sq ft of wall face (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the wall face area (length × height) and choose the option you want. Then pick the job complexity, add the cost of excavation & drainage and include permit / engineering.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 200 sq ft with the concrete block option (3–4 ft tall) comes to about $9,900.00 — $49.50 per sq ft of wall face including extras — with typical quotes between $8,415.00 and $11,880.00.",
    assumptions: "Typical 2026 prices per square foot of wall face: timber $25–$35, segmental block $30–$50, poured concrete $40–$60, natural stone $50–$80. Walls over about 4 ft usually need an engineer and permit. Good drainage behind the wall prevents failure." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a retaining wall cost?", answer: "Commonly $30–$70 per square foot of face, so a 50 ft × 3 ft block wall runs about $6,000–$9,000." },
      { question: "Do I need a permit for a retaining wall?", answer: "Often for walls over 3–4 feet or near property lines and structures — check locally." },
    ],
  },
  {
    slug: "landscaping-cost-calculator",
    title: "Landscaping Cost Calculator",
    description: "Estimate landscaping cost by area and project level — basic sod and mulch to full designs with hardscaping — with clearing, grading and design.",
    metaTitle: "Landscaping Cost Calculator — 2026 Prices",
    metaDescription: "Free landscaping cost calculator. Estimate landscaping cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Area to Landscape", { unit: "sq ft", default: 2000, max: 100000, step: 1 }),
      dropdown("tier", "Option", [["Basic (sod, mulch, a few plants)", 0], ["Planting beds & shrubs", 1], ["Full design with hardscape", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Easy / standard", 1], ["Moderate", 1.15], ["Difficult", 1.3]], 1),
      currencyField("removalPerUnit", "Clearing & Grading per sq ft", { default: 0.5, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Design Fee", { default: 500, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the area to landscape and choose the option you want. Then pick the job complexity, add the cost of clearing & grading and include design fee.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 2,000 sq ft with the planting beds & shrubs option (moderate) comes to about $21,500.00 — $10.75 per sq ft including extras — with typical quotes between $18,275.00 and $25,800.00.",
    assumptions: "Typical 2026 costs: basic yard refresh $3–$6, planted beds $8–$15, full design-build with patios and lighting $15–$40 per sq ft. Mature trees, irrigation and lighting add more. Phasing the work spreads the cost." + " " + REGION_NOTE,
    faq: [
      { question: "How much does landscaping cost?", answer: "A front yard refresh often costs $3,000–$8,000; full backyard designs with hardscape commonly run $20,000–$60,000+." },
      { question: "Does landscaping add value to a home?", answer: "Good landscaping can add 5–10% to perceived value and helps homes sell faster." },
    ],
  },
  {
    slug: "siding-cost-calculator",
    title: "Siding Cost Calculator",
    description: "Estimate siding replacement cost by wall area and material — vinyl, engineered wood or fiber cement — with stories, removal and trim.",
    metaTitle: "Siding Cost Calculator — 2026 Prices",
    metaDescription: "Free siding cost calculator. Estimate siding cost by sq ft of wall and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Wall Area to Side", { unit: "sq ft", default: 1800, max: 20000, step: 1 }),
      dropdown("tier", "Option", [["Vinyl", 0], ["Engineered wood", 1], ["Fiber cement", 2]], 1),
      dropdown("complexity", "Job Complexity", [["One story", 1], ["Two stories", 1.15], ["Three stories / steep access", 1.3]], 1),
      currencyField("removalPerUnit", "Old Siding Removal per sq ft", { default: 1.5, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Trim, Wrap & Permits", { default: 1200, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Sq ft of wall (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the wall area to side and choose the option you want. Then pick the job complexity, add the cost of old siding removal and include trim, wrap & permits.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 1,800 sq ft with the engineered wood option (two stories) comes to about $20,100.00 — $11.17 per sq ft of wall including extras — with typical quotes between $17,085.00 and $24,120.00.",
    assumptions: "Typical 2026 installed prices: vinyl $5–$9, engineered wood $7–$11, fiber cement $9–$15 per sq ft. Wall area ≈ perimeter × wall height minus large openings. House wrap and trim are often extra." + " " + REGION_NOTE,
    faq: [
      { question: "How much does new siding cost?", answer: "For a typical 2,000 sq ft home, vinyl siding runs about $12,000–$18,000 and fiber cement $20,000–$30,000." },
      { question: "How do I measure siding area?", answer: "Multiply each wall's length by its height, add gables (base × height ÷ 2) and subtract garage doors and big windows." },
    ],
  },
  {
    slug: "gutter-cost-calculator",
    title: "Gutter Cost Calculator",
    description: "Estimate gutter installation cost by length and material — vinyl, seamless aluminum or copper — with stories, removal and downspouts.",
    metaTitle: "Gutter Cost Calculator — 2026 Prices",
    metaDescription: "Free gutter cost calculator. Estimate gutter cost by linear ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Gutter Length", { unit: "linear ft", default: 160, max: 2000, step: 1 }),
      dropdown("tier", "Option", [["Vinyl", 0], ["Seamless aluminum", 1], ["Copper", 2]], 1),
      dropdown("complexity", "Job Complexity", [["One story", 1], ["Two stories", 1.15], ["Three stories / steep access", 1.3]], 1),
      currencyField("removalPerUnit", "Old Gutter Removal per ft", { default: 1.5, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Downspouts", { default: 400, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Linear ft (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the gutter length and choose the option you want. Then pick the job complexity, add the cost of old gutter removal and include downspouts.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 160 linear ft with the seamless aluminum option (two stories) comes to about $2,560.00 — $16.00 per linear ft including extras — with typical quotes between $2,176.00 and $3,072.00.",
    assumptions: "Typical 2026 prices per linear foot: vinyl $4–$8, seamless aluminum $8–$15, steel $10–$20, copper $25–$40. Gutter length roughly equals the roof's eave length. Each downspout adds about $100–$150." + " " + REGION_NOTE,
    faq: [
      { question: "How much do gutters cost?", answer: "Seamless aluminum gutters for a typical home cost about $1,200–$2,500 installed." },
      { question: "How many downspouts do I need?", answer: "About one per 30–40 feet of gutter, and at least one at each end of long runs." },
    ],
  },
  {
    slug: "gutter-guard-cost-calculator",
    title: "Gutter Guard Cost Calculator",
    description: "Estimate gutter guard cost by length and type — basic screens, micro-mesh or premium installed systems — with stories and cleaning.",
    metaTitle: "Gutter Guard Cost Calculator — 2026 Prices",
    metaDescription: "Free gutter guard cost calculator. Estimate gutter guard cost by linear ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Gutter Length", { unit: "linear ft", default: 160, max: 2000, step: 1 }),
      dropdown("tier", "Option", [["Screen / mesh", 0], ["Micro-mesh", 1], ["Premium installed system", 2]], 1),
      dropdown("complexity", "Job Complexity", [["One story", 1], ["Two stories", 1.15], ["Three stories / steep access", 1.3]], 1),
      currencyField("removalPerUnit", "Gutter Cleaning Before Install per ft", { default: 0.5, max: 100000, step: 0.05, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Linear ft (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the gutter length and choose the option you want. Then pick the job complexity and add the cost of gutter cleaning before install.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 160 linear ft with the micro-mesh option (two stories) comes to about $2,480.00 — $15.50 per linear ft including extras — with typical quotes between $2,108.00 and $2,976.00.",
    assumptions: "Typical 2026 prices per linear foot installed: screens $4–$8, micro-mesh $10–$20, branded systems $20–$40. No guard is maintenance-free — plan occasional rinsing. Compare the cost with paying for cleaning twice a year." + " " + REGION_NOTE,
    faq: [
      { question: "Are gutter guards worth it?", answer: "If you have overhanging trees or a two-story home, guards usually pay off by reducing cleaning and clogs." },
      { question: "How much do gutter guards cost?", answer: "Roughly $5–$40 per foot installed, so $800–$6,000 for a typical home." },
    ],
  },
  {
    slug: "hail-damage-repair-cost-calculator",
    title: "Hail Damage Repair Cost Calculator",
    description: "Estimate hail damage repair costs for your roof — from patching to full replacement — plus gutters, siding and windows, before your insurance deductible.",
    metaTitle: "Hail Damage Repair Cost Calculator — 2026 Prices",
    metaDescription: "Free hail damage repair cost calculator. Estimate hail damage repair cost by sq ft of roof and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Roof Area Affected", { unit: "sq ft", default: 2000, max: 20000, step: 1 }),
      dropdown("tier", "Option", [["Minor repairs / patching", 0], ["Partial replacement", 1], ["Full roof replacement", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Low pitch", 1], ["Medium pitch", 1.15], ["Steep pitch", 1.35]], 1),
      currencyField("removalPerUnit", "Damaged Decking per sq ft", { default: 0.5, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Gutter, Siding & Window Repairs", { default: 1500, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Sq ft of roof (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the roof area affected and choose the option you want. Then pick the job complexity, add the cost of damaged decking and include gutter, siding & window repairs.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 2,000 sq ft with the partial replacement option (medium pitch) comes to about $11,500.00 — $5.75 per sq ft of roof including extras — with typical quotes between $9,775.00 and $13,800.00.",
    assumptions: "Insurance usually covers hail damage minus your deductible (often 1–2% of dwelling coverage in hail-prone states). Get the adjuster on the roof with your contractor, and keep photos. Matching discontinued shingles can force a full replacement." + " " + REGION_NOTE,
    faq: [
      { question: "Does insurance cover hail damage to a roof?", answer: "Usually yes, minus your deductible, if the damage is recent and functional rather than cosmetic." },
      { question: "How do I know if hail damaged my roof?", answer: "Look for dents in gutters, vents and siding, and bruised or granule-free spots on shingles; a roofer can inspect safely." },
    ],
  },
  {
    slug: "artificial-turf-cost-calculator",
    title: "Artificial Turf Cost Calculator",
    description: "Estimate artificial turf cost by area and grade — basic, mid-grade or premium pet and putting-green turf — with site prep and removal.",
    metaTitle: "Artificial Turf Cost Calculator — 2026 Prices",
    metaDescription: "Free artificial turf cost calculator. Estimate artificial turf cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Turf Area", { unit: "sq ft", default: 500, max: 50000, step: 1 }),
      dropdown("tier", "Option", [["Basic landscape turf", 0], ["Mid-grade", 1], ["Premium / pet / putting green", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Easy / standard", 1], ["Moderate", 1.15], ["Difficult", 1.3]], 1),
      currencyField("removalPerUnit", "Old Grass Removal per sq ft", { default: 1.5, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Edging & Infill", { default: 300, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the turf area and choose the option you want. Then pick the job complexity, add the cost of old grass removal and include edging & infill.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 500 sq ft with the mid-grade option (moderate) comes to about $6,050.00 — $12.10 per sq ft including extras — with typical quotes between $5,142.50 and $7,260.00.",
    assumptions: "Typical 2026 installed prices: $7–$10 per sq ft for basic, $10–$14 for mid-grade and $14–$20 for premium. Base preparation (excavation, crushed rock, compaction) is a big part of labor. Turf saves water and mowing over 15–20 years." + " " + REGION_NOTE,
    faq: [
      { question: "How much does artificial grass cost?", answer: "About $8–$18 per square foot installed, so a 500 sq ft yard is roughly $4,000–$9,000." },
      { question: "Is artificial turf worth it?", answer: "In dry climates it often pays back in 5–10 years through water and maintenance savings." },
    ],
  },
  {
    slug: "concrete-price-calculator",
    title: "Concrete Price Calculator",
    description: "Estimate concrete slab, driveway or patio cost by area and type — plain, reinforced or stamped — with access, removal and pumping.",
    metaTitle: "Concrete Price Calculator — 2026 Prices",
    metaDescription: "Free concrete price calculator. Estimate concrete cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Slab Area", { unit: "sq ft", default: 400, max: 50000, step: 1 }),
      dropdown("tier", "Option", [["4 in plain broom finish", 0], ["6 in reinforced", 1], ["Stamped / decorative", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Easy / standard", 1], ["Moderate", 1.15], ["Difficult", 1.3]], 1),
      currencyField("removalPerUnit", "Old Concrete Removal per sq ft", { default: 3, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Permit / Pump Truck", { default: 400, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the slab area and choose the option you want. Then pick the job complexity, add the cost of old concrete removal and include permit / pump truck.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 400 sq ft with the 6 in reinforced option (moderate) comes to about $5,200.00 — $13.00 per sq ft including extras — with typical quotes between $4,420.00 and $6,240.00.",
    assumptions: "Typical 2026 installed prices: plain 4 in slabs $6–$9, reinforced 6 in $8–$12, stamped or colored $12–$20 per sq ft. Ready-mix concrete is about $150–$200 per cubic yard; a 4 in slab uses 1 yard per 81 sq ft." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a concrete slab cost?", answer: "About $6–$12 per square foot installed for plain concrete, so a 20 × 20 ft slab is roughly $2,500–$4,500." },
      { question: "How thick should a concrete driveway be?", answer: "At least 4 inches for cars and 5–6 inches for heavy trucks or RVs." },
    ],
  },
  {
    slug: "concrete-stain-cost-calculator",
    title: "Concrete Stain Cost Calculator",
    description: "Estimate concrete staining cost by area and finish — seal only, stain and seal, or decorative multi-color — with surface prep.",
    metaTitle: "Concrete Stain Cost Calculator — 2026 Prices",
    metaDescription: "Free concrete stain cost calculator. Estimate concrete stain cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Area to Stain", { unit: "sq ft", default: 500, max: 50000, step: 1 }),
      dropdown("tier", "Option", [["Clean & seal only", 0], ["Stain & seal", 1], ["Multi-color / decorative", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Clean concrete", 1], ["Cracked / stained", 1.2], ["Old coating to remove", 1.4]], 1),
      currencyField("removalPerUnit", "Coating Removal per sq ft", { default: 1.5, max: 100000, step: 0.05, required: false }),
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
    instructions: "Enter the area to stain and choose the option you want. Then pick the job complexity and add the cost of coating removal.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 500 sq ft with the stain & seal option (cracked / stained) comes to about $2,750.00 — $5.50 per sq ft including extras — with typical quotes between $2,337.50 and $3,300.00.",
    assumptions: "Typical 2026 professional prices: sealing $1–$2, acid or water-based stain and seal $3–$5, decorative work $6–$12 per sq ft. DIY kits cost $0.30–$1 per sq ft. Results depend on the concrete — test a small area first." + " " + REGION_NOTE,
    faq: [
      { question: "How much does it cost to stain concrete?", answer: "About $3–$5 per square foot professionally for a standard stain and seal." },
      { question: "How long does stained concrete last?", answer: "The color lasts for years; reseal every 2–3 years outdoors and in high-traffic areas." },
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
