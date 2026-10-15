// One-time (but safe to re-run) batch setup script: creates 13 kitchen cost tools
// from the user's shopping list (Shopping Calculators > Home Improvement Cost & Sizing Calculators).
// See src/lib/calc-engine-shopping-home-cost-kitchen.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-home-cost-kitchen-calculators.ts
// or
//   npm run db:create-shopping-home-cost-kitchen-calculators

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
    slug: "kitchen-remodel-cost-calculator",
    title: "Kitchen Remodel Cost Calculator",
    description: "Estimate kitchen remodel cost by size and scope — minor cosmetic, midrange or upscale — with layout changes, demolition, design and permits.",
    metaTitle: "Kitchen Remodel Cost Calculator — 2026 Prices",
    metaDescription: "Free kitchen remodel cost calculator. Estimate kitchen remodel cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Kitchen Floor Area", { unit: "sq ft", default: 150, max: 2000, step: 1 }),
      dropdown("tier", "Option", [["Minor / cosmetic", 0], ["Midrange", 1], ["Upscale", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Same layout", 1], ["Move plumbing / appliances", 1.15], ["Structural changes", 1.35]], 1),
      currencyField("removalPerUnit", "Demolition per sq ft", { default: 5, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Design & Permits", { default: 2500, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the kitchen floor area and choose the option you want. Then pick the job complexity, add the cost of demolition and include design & permits.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 150 sq ft with the midrange option (move plumbing / appliances) comes to about $48,250.00 — $321.67 per sq ft including extras — with typical quotes between $41,012.50 and $57,900.00.",
    assumptions: "Typical 2026 costs: minor refresh $100–$200, midrange $250–$350, upscale $400–$600+ per sq ft. Cabinets are usually the largest line item (about 30%). Keep a 10–20% contingency for surprises behind walls." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a kitchen remodel cost?", answer: "Midrange remodels of a 150 sq ft kitchen commonly cost $35,000–$55,000; minor updates $15,000–$30,000." },
      { question: "What adds the most cost to a kitchen remodel?", answer: "Moving plumbing, gas or walls, custom cabinets and high-end appliances." },
    ],
  },
  {
    slug: "bathroom-remodel-cost-calculator",
    title: "Bathroom Remodel Cost Calculator",
    description: "Estimate bathroom remodel cost by size and scope — cosmetic, midrange or upscale — with layout changes, demolition and permits.",
    metaTitle: "Bathroom Remodel Cost Calculator — 2026 Prices",
    metaDescription: "Free bathroom remodel cost calculator. Estimate bathroom remodel cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Bathroom Floor Area", { unit: "sq ft", default: 50, max: 500, step: 1 }),
      dropdown("tier", "Option", [["Cosmetic refresh", 0], ["Midrange", 1], ["Upscale", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Same layout", 1], ["Move fixtures", 1.15], ["Full gut / structural", 1.35]], 1),
      currencyField("removalPerUnit", "Demolition per sq ft", { default: 8, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Permits & Design", { default: 1500, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the bathroom floor area and choose the option you want. Then pick the job complexity, add the cost of demolition and include permits & design.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 50 sq ft with the midrange option (move fixtures) comes to about $16,900.00 — $338.00 per sq ft including extras — with typical quotes between $14,365.00 and $20,280.00.",
    assumptions: "Typical 2026 costs: $125–$200 per sq ft for cosmetic updates, $250–$350 midrange and $450–$650+ upscale. Small baths cost more per sq ft because fixtures and plumbing are fixed costs." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a bathroom remodel cost?", answer: "A midrange remodel of a 5 × 8 ft hall bath usually runs $12,000–$25,000." },
      { question: "What's the most expensive part of a bathroom remodel?", answer: "Tile work and moving plumbing; a custom tiled shower alone can cost $8,000–$15,000." },
    ],
  },
  {
    slug: "shower-remodel-cost-calculator",
    title: "Shower Remodel Cost Calculator",
    description: "Estimate shower remodel cost — prefab surround, tiled shower or custom curbless — by tiled area, with plumbing changes, demolition and fixtures.",
    metaTitle: "Shower Remodel Cost Calculator — 2026 Prices",
    metaDescription: "Free shower remodel cost calculator. Estimate shower remodel cost by sq ft of tiled surface and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Shower Wall & Floor Area", { unit: "sq ft", default: 100, max: 600, step: 1 }),
      dropdown("tier", "Option", [["Prefab surround / kit", 0], ["Tiled shower", 1], ["Custom stone / curbless", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Same location", 1], ["Move drain / valve", 1.15], ["Convert tub to walk-in", 1.3]], 1),
      currencyField("removalPerUnit", "Demolition per sq ft", { default: 5, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Valve, Fixtures & Drain", { default: 800, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Sq ft of tiled surface (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the shower wall & floor area and choose the option you want. Then pick the job complexity, add the cost of demolition and include valve, fixtures & drain.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 100 sq ft with the tiled shower option (move drain / valve) comes to about $4,800.00 — $48.00 per sq ft of tiled surface including extras — with typical quotes between $4,080.00 and $5,760.00.",
    assumptions: "Typical 2026 costs: prefab surrounds $2,500–$5,000, tiled showers $7,000–$15,000, custom stone or curbless $15,000–$25,000+. A standard 3 × 5 ft shower has about 90–110 sq ft of tile on walls and floor. Proper waterproofing is essential." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a tiled shower cost?", answer: "Usually $7,000–$15,000 including waterproofing, tile, valve and glass." },
      { question: "How much does a tub-to-shower conversion cost?", answer: "Often $6,000–$12,000, depending on tile and whether plumbing moves." },
    ],
  },
  {
    slug: "cabinet-refacing-cost-calculator",
    title: "Cabinet Refacing Cost Calculator",
    description: "Estimate cabinet refacing cost by linear feet — thermofoil, wood veneer or solid wood doors — with layout complexity and hardware.",
    metaTitle: "Cabinet Refacing Cost Calculator — 2026 Prices",
    metaDescription: "Free cabinet refacing cost calculator. Estimate cabinet refacing cost by linear ft of cabinets and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Cabinet Length (Upper + Lower)", { unit: "linear ft", default: 25, max: 200, step: 0.5 }),
      dropdown("tier", "Option", [["Thermofoil / laminate", 0], ["Wood veneer", 1], ["Solid wood doors", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Standard layout", 1], ["Many tall / corner units", 1.1], ["Adds crown molding & panels", 1.2]], 1),
      currencyField("fixedCosts", "New Hardware", { default: 300, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Linear ft of cabinets (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the cabinet length (upper + lower) and choose the option you want. Then pick the job complexity and include new hardware.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 25 linear ft with the wood veneer option (many tall / corner units) comes to about $7,050.00 — $282.00 per linear ft of cabinets including extras — with typical quotes between $5,992.50 and $8,460.00.",
    assumptions: "Typical 2026 prices: $200–$400 per linear foot, often 40–50% less than new cabinets. Refacing keeps your boxes and layout and replaces doors, drawer fronts and visible surfaces. Boxes must be sound." + " " + REGION_NOTE,
    faq: [
      { question: "How much does cabinet refacing cost?", answer: "Usually $5,000–$10,000 for an average kitchen, about half the cost of new cabinets." },
      { question: "Is refacing better than painting cabinets?", answer: "Refacing gives a new door style; painting is cheaper but keeps the existing doors." },
    ],
  },
  {
    slug: "cabinet-painting-refinishing-cost-calculator",
    title: "Cabinet Painting & Refinishing Cost Calculator",
    description: "Estimate cabinet painting or refinishing cost by the number of doors and drawer fronts — brushed, sprayed or stain change — with prep and boxes.",
    metaTitle: "Cabinet Painting & Refinishing Cost Calculator — 2026 Prices",
    metaDescription: "Free cabinet painting & refinishing cost calculator. Estimate the cost with labor, extras and a low-high price range for your area.",
    calcInputs: [
      numberField("quantity", "Doors & Drawer Fronts", { unit: "doors", default: 40, max: 200, step: 0.5 }),
      dropdown("tier", "Option", [["Brushed / rolled paint", 0], ["Sprayed factory-style finish", 1], ["Stain change / glaze", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Good condition", 1], ["Repairs needed", 1.1], ["Heavy grease / damage", 1.2]], 1),
      currencyField("fixedCosts", "Cabinet Boxes & Frames", { default: 600, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Door or drawer front (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the doors & drawer fronts and choose the option you want. Then pick the job complexity and include cabinet boxes & frames.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 40 doors with the sprayed factory-style finish option (repairs needed) comes to about $5,800.00 — $145.00 per door or drawer front including extras — with typical quotes between $4,930.00 and $6,960.00.",
    assumptions: "Typical 2026 professional prices: $100–$160 per door or drawer front including the boxes, often $3,000–$7,000 for a kitchen. Sprayed finishes look smoother and last longer than brushed paint." + " " + REGION_NOTE,
    faq: [
      { question: "How much does it cost to paint kitchen cabinets?", answer: "About $3,000–$7,000 professionally for a typical kitchen, or $100–$150 per door." },
      { question: "How long do painted cabinets last?", answer: "A well-prepped, sprayed finish lasts 8–15 years with care." },
    ],
  },
  {
    slug: "cabinet-cost-calculator",
    title: "Cabinet Cost Calculator",
    description: "Estimate new kitchen cabinet cost by linear feet — stock, semi-custom or custom — with installation, layout complexity and removal.",
    metaTitle: "Cabinet Cost Calculator — 2026 Prices",
    metaDescription: "Free cabinet cost calculator. Estimate cabinet cost by linear ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Cabinet Length (Upper + Lower)", { unit: "linear ft", default: 30, max: 300, step: 0.5 }),
      dropdown("tier", "Option", [["Stock", 0], ["Semi-custom", 1], ["Custom", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Standard layout", 1], ["Islands & tall units", 1.1], ["Complex / ceiling-height", 1.2]], 1),
      currencyField("removalPerUnit", "Old Cabinet Removal per ft", { default: 20, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Hardware & Trim", { default: 300, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the cabinet length (upper + lower) and choose the option you want. Then pick the job complexity, add the cost of old cabinet removal and include hardware & trim.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 30 linear ft with the semi-custom option (islands & tall units) comes to about $14,400.00 — $480.00 per linear ft including extras — with typical quotes between $12,240.00 and $17,280.00.",
    assumptions: "Typical 2026 installed prices per linear foot: stock $200–$350, semi-custom $400–$650, custom $800–$1,200+. Count upper and lower runs separately. Countertops are extra." + " " + REGION_NOTE,
    faq: [
      { question: "How much do new kitchen cabinets cost?", answer: "A typical 10 × 12 kitchen (about 30 linear ft) costs $6,000–$12,000 for stock and $25,000+ for custom." },
      { question: "What's the difference between stock and custom cabinets?", answer: "Stock comes in set sizes; semi-custom adds options; custom is built to fit your space exactly." },
    ],
  },
  {
    slug: "countertop-cost-calculator",
    title: "Countertop Cost Calculator",
    description: "Compare countertop costs by area — laminate, natural stone and quartz, or marble — with edge profiles, removal and cutouts.",
    metaTitle: "Countertop Cost Calculator — 2026 Prices",
    metaDescription: "Free countertop cost calculator. Estimate countertop cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Countertop Area", { unit: "sq ft", default: 50, max: 500, step: 1 }),
      dropdown("tier", "Option", [["Laminate", 0], ["Natural stone / quartz", 1], ["Marble / premium", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Simple edges", 1], ["Upgraded edges", 1.1], ["Waterfall / complex", 1.3]], 1),
      currencyField("removalPerUnit", "Old Countertop Removal per sq ft", { default: 10, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Sink & Cooktop Cutouts", { default: 350, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the countertop area and choose the option you want. Then pick the job complexity, add the cost of old countertop removal and include sink & cooktop cutouts.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 50 sq ft with the natural stone / quartz option (upgraded edges) comes to about $5,350.00 — $107.00 per sq ft including extras — with typical quotes between $4,547.50 and $6,420.00.",
    assumptions: "Typical 2026 installed prices: laminate $30–$50, granite and quartz $70–$120, marble $100–$200 per sq ft. Standard counters are 25 in deep, so each linear foot is about 2 sq ft. Backsplashes are extra." + " " + REGION_NOTE,
    faq: [
      { question: "How much do countertops cost?", answer: "A typical kitchen with 50 sq ft of counter costs $2,000 in laminate and $4,000–$6,000 in quartz or granite." },
      { question: "How do I measure countertop square feet?", answer: "Multiply each run's length by its depth (in feet) and add islands separately." },
    ],
  },
  {
    slug: "quartz-countertop-cost-calculator",
    title: "Quartz Countertop Cost Calculator",
    description: "Estimate quartz countertop cost by area and grade, with edge profile, waterfall ends, cutouts and removal.",
    metaTitle: "Quartz Countertop Cost Calculator — 2026 Prices",
    metaDescription: "Free quartz countertop cost calculator. Estimate quartz countertop cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Countertop Area", { unit: "sq ft", default: 50, max: 500, step: 1 }),
      dropdown("tier", "Option", [["Entry-level quartz", 0], ["Mid-range quartz", 1], ["Designer / premium quartz", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Eased edge", 1], ["Beveled / bullnose", 1.1], ["Ogee edge or waterfall", 1.3]], 1),
      currencyField("removalPerUnit", "Old Countertop Removal per sq ft", { default: 10, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Cutouts & Seams", { default: 300, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the countertop area and choose the option you want. Then pick the job complexity, add the cost of old countertop removal and include cutouts & seams.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 50 sq ft with the mid-range quartz option (beveled / bullnose) comes to about $5,550.00 — $111.00 per sq ft including extras — with typical quotes between $4,717.50 and $6,660.00.",
    assumptions: "Typical 2026 installed prices: $75–$125 per sq ft for most quartz, more for designer slabs that mimic marble. Quartz is non-porous and needs no sealing. Waterfall edges add one or two slab-height panels." + " " + REGION_NOTE,
    faq: [
      { question: "How much do quartz countertops cost?", answer: "About $75–$125 per square foot installed, so $3,750–$6,250 for 50 sq ft." },
      { question: "Quartz or granite?", answer: "Quartz is more consistent and needs no sealing; granite is unique natural stone and more heat-resistant." },
    ],
  },
  {
    slug: "granite-countertop-cost-calculator",
    title: "Granite Countertop Cost Calculator",
    description: "Estimate granite countertop cost by area and slab level, with edge profile, cutouts and removal.",
    metaTitle: "Granite Countertop Cost Calculator — 2026 Prices",
    metaDescription: "Free granite countertop cost calculator. Estimate granite countertop cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Countertop Area", { unit: "sq ft", default: 50, max: 500, step: 1 }),
      dropdown("tier", "Option", [["Level 1 (common colors)", 0], ["Level 2–3", 1], ["Exotic granite", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Eased edge", 1], ["Beveled / bullnose", 1.1], ["Ogee edge or waterfall", 1.3]], 1),
      currencyField("removalPerUnit", "Old Countertop Removal per sq ft", { default: 10, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Cutouts & Seams", { default: 300, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the countertop area and choose the option you want. Then pick the job complexity, add the cost of old countertop removal and include cutouts & seams.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 50 sq ft with the level 2–3 option (beveled / bullnose) comes to about $5,050.00 — $101.00 per sq ft including extras — with typical quotes between $4,292.50 and $6,060.00.",
    assumptions: "Typical 2026 installed prices: level 1 granite $60–$75, levels 2–3 $80–$100, exotic $120+ per sq ft. Granite should be sealed every 1–2 years. Visit the slab yard to choose your exact slab." + " " + REGION_NOTE,
    faq: [
      { question: "How much does granite cost per square foot?", answer: "About $60–$125 installed depending on the slab's level and rarity." },
      { question: "Does granite need sealing?", answer: "Yes, usually every year or two to resist stains." },
    ],
  },
  {
    slug: "epoxy-countertop-cost-calculator",
    title: "Epoxy Countertop Cost Calculator",
    description: "Estimate epoxy countertop cost by area — DIY kit, professional coating over existing counters, or custom river and wood-epoxy tops.",
    metaTitle: "Epoxy Countertop Cost Calculator — 2026 Prices",
    metaDescription: "Free epoxy countertop cost calculator. Estimate epoxy countertop cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Countertop Area", { unit: "sq ft", default: 50, max: 500, step: 1 }),
      dropdown("tier", "Option", [["DIY epoxy kit", 0], ["Professional epoxy coating", 1], ["Custom river / wood & epoxy", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Simple runs", 1], ["Edges & backsplash", 1.15], ["Complex shapes", 1.3]], 1),
      currencyField("fixedCosts", "Sealing & Topcoat", { default: 100, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the countertop area and choose the option you want. Then pick the job complexity and include sealing & topcoat.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 50 sq ft with the professional epoxy coating option (edges & backsplash) comes to about $3,100.00 — $62.00 per sq ft including extras — with typical quotes between $2,635.00 and $3,720.00.",
    assumptions: "Typical 2026 prices: DIY kits $8–$15, professional coatings $50–$70, custom river tables and wood-epoxy counters $100–$150+ per sq ft. Epoxy can scorch under hot pans and scratches more easily than stone." + " " + REGION_NOTE,
    faq: [
      { question: "How much do epoxy countertops cost?", answer: "DIY kits cost a few hundred dollars; professional installs usually run $50–$70 per sq ft." },
      { question: "Are epoxy countertops durable?", answer: "They're waterproof and seamless but softer than stone — use trivets and cutting boards." },
    ],
  },
  {
    slug: "backsplash-cost-calculator",
    title: "Backsplash Cost Calculator",
    description: "Estimate kitchen backsplash cost by area and material — ceramic subway, glass or porcelain mosaic, or natural stone — with removal and trim.",
    metaTitle: "Backsplash Cost Calculator — 2026 Prices",
    metaDescription: "Free backsplash cost calculator. Estimate backsplash cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Backsplash Area", { unit: "sq ft", default: 30, max: 300, step: 0.5 }),
      dropdown("tier", "Option", [["Ceramic subway tile", 0], ["Glass / porcelain mosaic", 1], ["Natural stone", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Simple wall", 1], ["Outlets & windows", 1.1], ["Full-height / range hood wall", 1.2]], 1),
      currencyField("removalPerUnit", "Old Backsplash Removal per sq ft", { default: 4, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Grout Sealing & Trim", { default: 150, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the backsplash area and choose the option you want. Then pick the job complexity, add the cost of old backsplash removal and include grout sealing & trim.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 30 sq ft with the glass / porcelain mosaic option (outlets & windows) comes to about $1,230.00 — $41.00 per sq ft including extras — with typical quotes between $1,045.50 and $1,476.00.",
    assumptions: "Typical 2026 installed prices: ceramic $15–$25, glass and mosaic $25–$40, stone $35–$55 per sq ft. A typical kitchen backsplash is 25–35 sq ft (18 in high behind the counters)." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a kitchen backsplash cost?", answer: "About $800–$1,800 for a typical 30 sq ft backsplash installed." },
      { question: "How do I measure a backsplash?", answer: "Multiply the length of counter runs by the height between counter and upper cabinets, minus windows." },
    ],
  },
  {
    slug: "kitchen-island-cost-calculator",
    title: "Kitchen Island Cost Calculator",
    description: "Estimate kitchen island cost by length — basic cabinet island, mid-range with seating, or custom with a sink or appliances — including countertop and utilities.",
    metaTitle: "Kitchen Island Cost Calculator — 2026 Prices",
    metaDescription: "Free kitchen island cost calculator. Estimate kitchen island cost by linear ft of island and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Island Length", { unit: "linear ft", default: 6, max: 20, step: 0.5 }),
      dropdown("tier", "Option", [["Basic cabinet island", 0], ["Mid-range with seating", 1], ["Custom with sink or appliances", 2]], 1),
      dropdown("complexity", "Job Complexity", [["No utilities", 1], ["Add electrical outlets", 1.15], ["Plumbing & electrical", 1.35]], 1),
      currencyField("fixedCosts", "Electrical Permit & Outlets", { default: 400, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Linear ft of island (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the island length and choose the option you want. Then pick the job complexity and include electrical permit & outlets.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 6 linear ft with the mid-range with seating option (add electrical outlets) comes to about $6,100.00 — $1,016.67 per linear ft of island including extras — with typical quotes between $5,185.00 and $7,320.00.",
    assumptions: "Typical 2026 costs: $3,000–$5,000 for a basic 6 ft island, $5,000–$10,000 with seating and stone, $10,000–$20,000+ with plumbing and appliances. Code usually requires outlets on islands." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a kitchen island cost?", answer: "About $3,000–$10,000 for most islands; adding a sink or cooktop raises the cost significantly." },
      { question: "How big should a kitchen island be?", answer: "At least 4 ft long and 2 ft deep, with 42–48 inches of clearance around it." },
    ],
  },
  {
    slug: "frameless-shower-door-cost-calculator",
    title: "Frameless Shower Door Cost Calculator",
    description: "Estimate frameless shower door cost by glass area — single door, door and panel, or custom enclosure — with fit complexity, removal and hardware.",
    metaTitle: "Frameless Shower Door Cost Calculator — 2026 Prices",
    metaDescription: "Free frameless shower door cost calculator. Estimate frameless shower door cost by sq ft of glass and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Glass Area", { unit: "sq ft", default: 24, max: 200, step: 0.5 }),
      dropdown("tier", "Option", [["Single door (3/8 in glass)", 0], ["Door & fixed panel", 1], ["Custom enclosure / steam", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Standard opening", 1], ["Out-of-square walls", 1.1], ["Neo-angle / custom shapes", 1.25]], 1),
      currencyField("removalPerUnit", "Old Door Removal per sq ft", { default: 5, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Hardware Upgrade", { default: 200, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Sq ft of glass (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the glass area and choose the option you want. Then pick the job complexity, add the cost of old door removal and include hardware upgrade.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 24 sq ft with the door & fixed panel option (out-of-square walls) comes to about $1,640.00 — $68.33 per sq ft of glass including extras — with typical quotes between $1,394.00 and $1,968.00.",
    assumptions: "Typical 2026 installed prices: $900–$1,500 for a single frameless door, $1,200–$2,500 for a door and panel, $2,500–$5,000+ for custom enclosures. Low-iron and coated glass cost more but look clearer and stay cleaner." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a frameless shower door cost?", answer: "Usually $1,000–$2,500 installed for a typical door and panel." },
      { question: "Are frameless shower doors worth it?", answer: "They look cleaner, are easier to clean and often add appeal for buyers." },
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
