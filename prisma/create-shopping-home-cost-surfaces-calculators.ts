// One-time (but safe to re-run) batch setup script: creates 14 surfaces cost tools
// from the user's shopping list (Shopping Calculators > Home Improvement Cost & Sizing Calculators).
// See src/lib/calc-engine-shopping-home-cost-surfaces.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-home-cost-surfaces-calculators.ts
// or
//   npm run db:create-shopping-home-cost-surfaces-calculators

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
    slug: "interior-painting-cost-calculator",
    title: "Interior Painting Cost Calculator",
    description: "Estimate interior painting cost from the floor area of the rooms — walls only, with ceilings, or with trim and doors — plus prep.",
    metaTitle: "Interior Painting Cost Calculator — 2026 Prices",
    metaDescription: "Free interior painting cost calculator. Estimate interior painting cost by sq ft of floor and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Floor Area of Rooms to Paint", { unit: "sq ft", default: 1500, max: 20000, step: 1 }),
      dropdown("tier", "Option", [["Walls only", 0], ["Walls & ceilings", 1], ["Walls, ceilings & trim", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Good condition", 1], ["Patching needed", 1.15], ["Major repairs / color change", 1.3]], 1),
      currencyField("removalPerUnit", "Wallpaper Removal / Prep per sq ft", { default: 0.5, max: 100000, step: 0.05, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Sq ft of floor (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the floor area of rooms to paint and choose the option you want. Then pick the job complexity and add the cost of wallpaper removal / prep.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 1,500 sq ft with the walls & ceilings option (patching needed) comes to about $7,500.00 — $5.00 per sq ft of floor including extras — with typical quotes between $6,375.00 and $9,000.00.",
    assumptions: "Typical 2026 professional prices: $2–$4 per sq ft of floor area for walls, $3.50–$6 with ceilings and $5–$8 including trim and doors. Painters may quote per room ($400–$1,000). Dark-to-light changes need extra coats." + " " + REGION_NOTE,
    faq: [
      { question: "How much does it cost to paint a room?", answer: "About $400–$1,000 for a typical 12 × 12 bedroom, depending on ceilings, trim and condition." },
      { question: "How much paint do I need?", answer: "About 1 gallon per 350–400 sq ft of wall per coat — usually two coats." },
    ],
  },
  {
    slug: "exterior-painting-cost-calculator",
    title: "Exterior Painting Cost Calculator",
    description: "Estimate exterior house painting cost by wall area and job type, with stories, scraping and prep, and trim and doors.",
    metaTitle: "Exterior Painting Cost Calculator — 2026 Prices",
    metaDescription: "Free exterior painting cost calculator. Estimate exterior painting cost by sq ft of wall and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Exterior Wall Area", { unit: "sq ft", default: 2000, max: 20000, step: 1 }),
      dropdown("tier", "Option", [["One coat refresh (vinyl / stucco)", 0], ["Standard two coats", 1], ["Wood siding with heavy prep", 2]], 1),
      dropdown("complexity", "Job Complexity", [["One story", 1], ["Two stories", 1.15], ["Three stories / steep access", 1.3]], 1),
      currencyField("removalPerUnit", "Scraping / Lead-Safe Prep per sq ft", { default: 0.75, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Trim, Doors & Shutters", { default: 600, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the exterior wall area and choose the option you want. Then pick the job complexity, add the cost of scraping / lead-safe prep and include trim, doors & shutters.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 2,000 sq ft with the standard two coats option (two stories) comes to about $9,100.00 — $4.55 per sq ft of wall including extras — with typical quotes between $7,735.00 and $10,920.00.",
    assumptions: "Typical 2026 prices: $2.50–$5 per sq ft of paintable wall area. Homes built before 1978 may need lead-safe practices. Good prep (washing, scraping, priming) matters more than paint brand." + " " + REGION_NOTE,
    faq: [
      { question: "How much does it cost to paint a house exterior?", answer: "Most homes cost $4,000–$10,000; large or two-story homes with lots of trim cost more." },
      { question: "How often should you paint a house exterior?", answer: "Every 5–10 years for wood siding, 10–15 for stucco and fiber cement." },
    ],
  },
  {
    slug: "popcorn-ceiling-removal-cost-calculator",
    title: "Popcorn Ceiling Removal Cost Calculator",
    description: "Estimate popcorn (acoustic) ceiling removal cost by area — scraping only, smooth finish and paint, or asbestos abatement.",
    metaTitle: "Popcorn Ceiling Removal Cost Calculator — 2026 Prices",
    metaDescription: "Free popcorn ceiling removal cost calculator. Estimate the cost with labor, extras and a low-high price range for your area.",
    calcInputs: [
      numberField("quantity", "Ceiling Area", { unit: "sq ft", default: 800, max: 10000, step: 1 }),
      dropdown("tier", "Option", [["Removal only", 0], ["Removal, skim coat & paint", 1], ["With asbestos abatement", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Empty room, 8 ft ceilings", 1], ["Furnished or 9–10 ft", 1.15], ["Vaulted / stairwells", 1.3]], 1),
      currencyField("fixedCosts", "Asbestos Test", { default: 50, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Sq ft of ceiling (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the ceiling area and choose the option you want. Then pick the job complexity and include asbestos test.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 800 sq ft with the removal, skim coat & paint option (furnished or 9–10 ft) comes to about $2,850.00 — $3.56 per sq ft of ceiling including extras — with typical quotes between $2,422.50 and $3,420.00.",
    assumptions: "Typical 2026 prices: $1–$2 per sq ft to scrape, $3–$4 with skim coat and paint, and $5–$10 with licensed asbestos abatement. Ceilings applied before the 1980s may contain asbestos — test before disturbing them." + " " + REGION_NOTE,
    faq: [
      { question: "How much does popcorn ceiling removal cost?", answer: "About $1–$4 per square foot, so $800–$3,200 for 800 sq ft, more if asbestos is present." },
      { question: "Does my popcorn ceiling have asbestos?", answer: "If it was installed before about 1985 it might. A lab test costs $30–$60 and is essential before scraping." },
    ],
  },
  {
    slug: "drywall-cost-calculator",
    title: "Drywall Cost Calculator",
    description: "Estimate drywall installation cost by area and finish level — hang only, Level 4 or Level 5 — with ceilings and demolition.",
    metaTitle: "Drywall Cost Calculator — 2026 Prices",
    metaDescription: "Free drywall cost calculator. Estimate drywall cost by sq ft of wall/ceiling and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Drywall Area", { unit: "sq ft", default: 1000, max: 50000, step: 1 }),
      dropdown("tier", "Option", [["Hang only (Level 2)", 0], ["Hang, tape & finish (Level 4)", 1], ["Smooth finish (Level 5)", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Walls", 1], ["Walls & ceilings", 1.15], ["High ceilings / complex angles", 1.3]], 1),
      currencyField("removalPerUnit", "Old Drywall Demo per sq ft", { default: 1, max: 100000, step: 0.05, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Sq ft of wall/ceiling (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the drywall area and choose the option you want. Then pick the job complexity and add the cost of old drywall demo.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 1,000 sq ft with the hang, tape & finish (level 4) option (walls & ceilings) comes to about $4,000.00 — $4.00 per sq ft of wall/ceiling including extras — with typical quotes between $3,400.00 and $4,800.00.",
    assumptions: "Typical 2026 prices: $1.50–$3.50 per sq ft installed and finished. A 4 × 8 sheet covers 32 sq ft. Moisture-resistant, fire-rated and soundproof boards cost more. Patches cost $75–$300 each." + " " + REGION_NOTE,
    faq: [
      { question: "How much does drywall cost per square foot?", answer: "About $2–$3.50 installed and finished, depending on finish level and ceiling height." },
      { question: "What is Level 5 drywall finish?", answer: "A skim coat over the entire surface for a perfectly smooth finish, used under glossy paint or strong side lighting." },
    ],
  },
  {
    slug: "insulation-cost-calculator",
    title: "Insulation Cost Calculator",
    description: "Estimate insulation cost by area and type — batts, blown-in or spray foam — for attics, walls and crawl spaces, with removal and air sealing.",
    metaTitle: "Insulation Cost Calculator — 2026 Prices",
    metaDescription: "Free insulation cost calculator. Estimate insulation cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Area to Insulate", { unit: "sq ft", default: 1000, max: 20000, step: 1 }),
      dropdown("tier", "Option", [["Fiberglass batts", 0], ["Blown-in cellulose / fiberglass", 1], ["Closed-cell spray foam", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Open attic", 1], ["Walls (drill & fill)", 1.2], ["Crawl space / tight areas", 1.3]], 1),
      currencyField("removalPerUnit", "Old Insulation Removal per sq ft", { default: 1.25, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Air Sealing", { default: 400, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the area to insulate and choose the option you want. Then pick the job complexity, add the cost of old insulation removal and include air sealing.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 1,000 sq ft with the blown-in cellulose / fiberglass option (walls (drill & fill)) comes to about $3,350.00 — $3.35 per sq ft including extras — with typical quotes between $2,847.50 and $4,020.00.",
    assumptions: "Typical 2026 installed prices: batts $1–$1.80, blown-in $1.20–$2.20, spray foam $2.50–$6 per sq ft depending on thickness. Federal energy-efficiency tax credits for insulation ended after 2025, but some utilities still offer rebates." + " " + REGION_NOTE,
    faq: [
      { question: "How much does attic insulation cost?", answer: "About $1,500–$3,500 for blown-in insulation in a typical attic." },
      { question: "How much insulation do I need in my attic?", answer: "Usually R-38 to R-60 depending on climate — about 12–20 inches of blown-in material." },
    ],
  },
  {
    slug: "wallpaper-cost-calculator",
    title: "Wallpaper Cost Calculator",
    description: "Estimate wallpaper installation cost by wall area and type — peel-and-stick, standard or designer — with pattern matching and removal.",
    metaTitle: "Wallpaper Cost Calculator — 2026 Prices",
    metaDescription: "Free wallpaper cost calculator. Estimate wallpaper cost by sq ft of wall and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Wall Area", { unit: "sq ft", default: 400, max: 10000, step: 1 }),
      dropdown("tier", "Option", [["Peel-and-stick", 0], ["Standard vinyl / paper", 1], ["Designer / grasscloth", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Plain walls", 1], ["Pattern matching / outlets", 1.15], ["Ceilings or stairwells", 1.3]], 1),
      currencyField("removalPerUnit", "Old Wallpaper Removal per sq ft", { default: 1, max: 100000, step: 0.05, required: false }),
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
    instructions: "Enter the wall area and choose the option you want. Then pick the job complexity and add the cost of old wallpaper removal.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 400 sq ft with the standard vinyl / paper option (pattern matching / outlets) comes to about $2,400.00 — $6.00 per sq ft of wall including extras — with typical quotes between $2,040.00 and $2,880.00.",
    assumptions: "Typical 2026 installed prices: $3–$6 per sq ft for standard papers and $8–$15+ for designer and grasscloth. Large repeats waste more paper. Walls must be smooth and primed first." + " " + REGION_NOTE,
    faq: [
      { question: "How much does it cost to wallpaper a room?", answer: "Often $500–$1,500 for an accent wall or small room, depending on paper and prep." },
      { question: "How much wallpaper do I need?", answer: "Divide the wall area by the roll's coverage and add 10–15% for pattern matching and waste." },
    ],
  },
  {
    slug: "tile-cost-calculator",
    title: "Tile Cost Calculator",
    description: "Estimate tile installation cost by area and material — ceramic, porcelain or natural stone — with pattern, removal and backer board.",
    metaTitle: "Tile Cost Calculator — 2026 Prices",
    metaDescription: "Free tile cost calculator. Estimate tile cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Tile Area", { unit: "sq ft", default: 200, max: 10000, step: 1 }),
      dropdown("tier", "Option", [["Ceramic", 0], ["Porcelain", 1], ["Natural stone", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Straight lay, floor", 1], ["Diagonal / herringbone", 1.15], ["Walls, niches & trim", 1.3]], 1),
      currencyField("removalPerUnit", "Old Floor Removal per sq ft", { default: 2, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Underlayment / Backer Board", { default: 300, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the tile area and choose the option you want. Then pick the job complexity, add the cost of old floor removal and include underlayment / backer board.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 200 sq ft with the porcelain option (diagonal / herringbone) comes to about $3,500.00 — $17.50 per sq ft including extras — with typical quotes between $2,975.00 and $4,200.00.",
    assumptions: "Typical 2026 installed prices: ceramic $8–$14, porcelain $12–$20, natural stone $18–$35 per sq ft. Large-format and mosaic tiles cost more to lay. Add 10–15% extra tile for cuts and breakage." + " " + REGION_NOTE,
    faq: [
      { question: "How much does tile installation cost?", answer: "Labor is about $5–$12 per square foot plus the tile, so most floors cost $10–$25 per sq ft all-in." },
      { question: "How much extra tile should I buy?", answer: "10% for straight layouts and 15–20% for diagonal or herringbone patterns." },
    ],
  },
  {
    slug: "flooring-cost-calculator",
    title: "Flooring Cost Calculator",
    description: "Compare flooring installation costs by area and level — budget, mid-range or premium — with removal, trim and furniture moving.",
    metaTitle: "Flooring Cost Calculator — 2026 Prices",
    metaDescription: "Free flooring cost calculator. Estimate flooring cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Floor Area", { unit: "sq ft", default: 1000, max: 50000, step: 1 }),
      dropdown("tier", "Option", [["Budget (carpet, sheet vinyl)", 0], ["Mid-range (LVP, laminate)", 1], ["Premium (hardwood, tile)", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Easy / standard", 1], ["Moderate", 1.15], ["Difficult", 1.3]], 1),
      currencyField("removalPerUnit", "Old Flooring Removal per sq ft", { default: 1.5, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Transitions, Trim & Moving Furniture", { default: 300, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the floor area and choose the option you want. Then pick the job complexity, add the cost of old flooring removal and include transitions, trim & moving furniture.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 1,000 sq ft with the mid-range (lvp, laminate) option (moderate) comes to about $7,800.00 — $7.80 per sq ft including extras — with typical quotes between $6,630.00 and $9,360.00.",
    assumptions: "Typical 2026 installed prices: carpet and sheet vinyl $3–$6, laminate and LVP $4–$9, hardwood $8–$15, tile $10–$20 per sq ft. Subfloor repairs and stairs add cost. Measure each room and add 10% for waste." + " " + REGION_NOTE,
    faq: [
      { question: "What is the cheapest flooring to install?", answer: "Sheet vinyl and carpet are usually cheapest; laminate and LVP offer the best value for a durable hard floor." },
      { question: "How much does new flooring cost for 1,000 sq ft?", answer: "Roughly $4,000–$12,000 depending on material, more for hardwood or tile." },
    ],
  },
  {
    slug: "laminate-flooring-cost-calculator",
    title: "Laminate Flooring Cost Calculator",
    description: "Estimate laminate flooring cost by area and grade, with installation layout, old floor removal, underlayment and trim.",
    metaTitle: "Laminate Flooring Cost Calculator — 2026 Prices",
    metaDescription: "Free laminate flooring cost calculator. Estimate laminate flooring cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Floor Area", { unit: "sq ft", default: 800, max: 20000, step: 1 }),
      dropdown("tier", "Option", [["Budget (7–8 mm)", 0], ["Mid-range (10–12 mm)", 1], ["Premium waterproof", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Open rooms", 1], ["Many small rooms / closets", 1.15], ["Includes stairs", 1.3]], 1),
      currencyField("removalPerUnit", "Old Flooring Removal per sq ft", { default: 1.25, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Underlayment & Trim", { default: 250, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the floor area and choose the option you want. Then pick the job complexity, add the cost of old flooring removal and include underlayment & trim.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 800 sq ft with the mid-range (10–12 mm) option (many small rooms / closets) comes to about $5,250.00 — $6.56 per sq ft including extras — with typical quotes between $4,462.50 and $6,300.00.",
    assumptions: "Typical 2026 prices: laminate material $1.50–$5 and installation $2–$3 per sq ft. Add 10% for waste. Waterproof laminates suit kitchens; avoid standard laminate in wet bathrooms." + " " + REGION_NOTE,
    faq: [
      { question: "How much does laminate flooring cost installed?", answer: "About $3.50–$8 per square foot including installation." },
      { question: "Is laminate cheaper than vinyl plank?", answer: "Usually a little cheaper per sq ft, but vinyl plank is fully waterproof." },
    ],
  },
  {
    slug: "hardwood-floor-cost-calculator",
    title: "Hardwood Floor Cost Calculator",
    description: "Estimate hardwood flooring cost by area — engineered, solid oak or exotic — with layout, removal, subfloor prep and trim.",
    metaTitle: "Hardwood Floor Cost Calculator — 2026 Prices",
    metaDescription: "Free hardwood floor cost calculator. Estimate hardwood floor cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Floor Area", { unit: "sq ft", default: 800, max: 20000, step: 1 }),
      dropdown("tier", "Option", [["Engineered hardwood", 0], ["Solid oak", 1], ["Exotic / wide plank", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Open rooms", 1], ["Many rooms / closets", 1.1], ["Stairs or patterns", 1.25]], 1),
      currencyField("removalPerUnit", "Old Flooring Removal per sq ft", { default: 2, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Subfloor Prep & Trim", { default: 400, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the floor area and choose the option you want. Then pick the job complexity, add the cost of old flooring removal and include subfloor prep & trim.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 800 sq ft with the solid oak option (many rooms / closets) comes to about $10,800.00 — $13.50 per sq ft including extras — with typical quotes between $9,180.00 and $12,960.00.",
    assumptions: "Typical 2026 installed prices: engineered $8–$12, solid oak $10–$14, exotic and wide plank $14–$20+ per sq ft. Site-finished floors cost more than prefinished. Leave flooring to acclimate for several days." + " " + REGION_NOTE,
    faq: [
      { question: "How much do hardwood floors cost?", answer: "Roughly $9–$16 per square foot installed, so $7,000–$13,000 for 800 sq ft." },
      { question: "Engineered or solid hardwood?", answer: "Engineered is more stable over concrete and in humid areas; solid can be refinished more times." },
    ],
  },
  {
    slug: "vinyl-plank-flooring-cost-calculator",
    title: "Vinyl Plank Flooring Cost Calculator",
    description: "Estimate luxury vinyl plank (LVP) flooring cost by area and grade, with layout, removal, underlayment and trim.",
    metaTitle: "Vinyl Plank Flooring Cost Calculator — 2026 Prices",
    metaDescription: "Free vinyl plank flooring cost calculator. Estimate vinyl plank flooring cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Floor Area", { unit: "sq ft", default: 800, max: 20000, step: 1 }),
      dropdown("tier", "Option", [["Basic LVP (4 mm)", 0], ["Mid-range with pad (6 mm)", 1], ["Rigid core SPC premium", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Open rooms", 1], ["Many rooms / closets", 1.1], ["Stairs", 1.25]], 1),
      currencyField("removalPerUnit", "Old Flooring Removal per sq ft", { default: 1.25, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Underlayment & Trim", { default: 250, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the floor area and choose the option you want. Then pick the job complexity, add the cost of old flooring removal and include underlayment & trim.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 800 sq ft with the mid-range with pad (6 mm) option (many rooms / closets) comes to about $5,650.00 — $7.06 per sq ft including extras — with typical quotes between $4,802.50 and $6,780.00.",
    assumptions: "Typical 2026 installed prices: $4–$8 per sq ft. Thicker wear layers (12–20 mil) last longer in busy homes. LVP is waterproof, making it popular for kitchens, baths and basements." + " " + REGION_NOTE,
    faq: [
      { question: "How much does vinyl plank flooring cost?", answer: "About $4–$8 per square foot installed, or $3,200–$6,400 for 800 sq ft." },
      { question: "Is LVP good for basements?", answer: "Yes — it's waterproof and handles slight moisture, though concrete should be checked for moisture first." },
    ],
  },
  {
    slug: "epoxy-floor-cost-calculator",
    title: "Epoxy Floor Cost Calculator",
    description: "Estimate epoxy floor coating cost for garages and basements by area — solid color, flake or metallic — with concrete repair and grinding.",
    metaTitle: "Epoxy Floor Cost Calculator — 2026 Prices",
    metaDescription: "Free epoxy floor cost calculator. Estimate epoxy floor cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Floor Area", { unit: "sq ft", default: 500, max: 50000, step: 1 }),
      dropdown("tier", "Option", [["Solid-color epoxy", 0], ["Flake system", 1], ["Metallic epoxy", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Sound concrete", 1], ["Cracks to repair", 1.15], ["Heavily damaged / old coating", 1.3]], 1),
      currencyField("removalPerUnit", "Grinding Old Coating per sq ft", { default: 1, max: 100000, step: 0.05, required: false }),
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
    instructions: "Enter the floor area and choose the option you want. Then pick the job complexity and add the cost of grinding old coating.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 500 sq ft with the flake system option (cracks to repair) comes to about $4,000.00 — $8.00 per sq ft including extras — with typical quotes between $3,400.00 and $4,800.00.",
    assumptions: "Typical 2026 professional prices: $4–$6 for solid color, $6–$9 for flake and $10–$14 per sq ft for metallic. Polyaspartic topcoats cure faster and resist UV yellowing. DIY kits cost $1–$2 per sq ft." + " " + REGION_NOTE,
    faq: [
      { question: "How much does it cost to epoxy a garage floor?", answer: "About $2,000–$4,500 professionally for a two-car garage (about 450–500 sq ft)." },
      { question: "How long does an epoxy floor last?", answer: "Professionally installed coatings typically last 10–20 years in residential garages." },
    ],
  },
  {
    slug: "floor-refinishing-cost-calculator",
    title: "Floor Refinishing Cost Calculator",
    description: "Estimate hardwood floor refinishing cost by area — screen and recoat, full sanding, or sanding with a stain color change.",
    metaTitle: "Floor Refinishing Cost Calculator — 2026 Prices",
    metaDescription: "Free floor refinishing cost calculator. Estimate floor refinishing cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Floor Area", { unit: "sq ft", default: 600, max: 20000, step: 1 }),
      dropdown("tier", "Option", [["Screen & recoat", 0], ["Full sand & refinish", 1], ["Sand, stain & refinish", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Open rooms", 1], ["Many rooms / closets", 1.1], ["Stairs", 1.25]], 1),
      currencyField("removalPerUnit", "Board Repairs per sq ft", { default: 0.5, max: 100000, step: 0.05, required: false }),
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
    instructions: "Enter the floor area and choose the option you want. Then pick the job complexity and add the cost of board repairs.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 600 sq ft with the full sand & refinish option (many rooms / closets) comes to about $2,700.00 — $4.50 per sq ft including extras — with typical quotes between $2,295.00 and $3,240.00.",
    assumptions: "Typical 2026 prices: screen and recoat $1–$2, full sand and refinish $3–$5, with stain $4–$6 per sq ft. Engineered floors can only be sanded if the wear layer is thick enough. Plan 3–5 days out of the rooms." + " " + REGION_NOTE,
    faq: [
      { question: "How much does it cost to refinish hardwood floors?", answer: "About $3–$5 per square foot for a full sand and refinish." },
      { question: "How often can you refinish hardwood?", answer: "Solid hardwood can be sanded 4–6 times over its life; engineered 1–3 times depending on the wear layer." },
    ],
  },
  {
    slug: "carpet-cost-calculator",
    title: "Carpet Cost Calculator",
    description: "Estimate carpet cost by area and grade — budget, mid-range or premium wool — including pad and installation, with stairs and removal.",
    metaTitle: "Carpet Cost Calculator — 2026 Prices",
    metaDescription: "Free carpet cost calculator. Estimate carpet cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Carpet Area", { unit: "sq ft", default: 800, max: 20000, step: 1 }),
      dropdown("tier", "Option", [["Budget", 0], ["Mid-range", 1], ["Premium / wool", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Open rooms", 1], ["Many rooms / closets", 1.1], ["Includes stairs", 1.25]], 1),
      currencyField("removalPerUnit", "Old Carpet Removal per sq ft", { default: 0.5, max: 100000, step: 0.05, required: false }),
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
    instructions: "Enter the carpet area and choose the option you want. Then pick the job complexity and add the cost of old carpet removal.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 800 sq ft with the mid-range option (many rooms / closets) comes to about $4,400.00 — $5.50 per sq ft including extras — with typical quotes between $3,740.00 and $5,280.00.",
    assumptions: "Typical 2026 installed prices including pad: $3–$5 budget, $5–$7 mid-range, $8–$12+ per sq ft premium. Carpet comes in 12 ft rolls, so seams and waste add 10–15%. Stairs cost $10–$30 per step." + " " + REGION_NOTE,
    faq: [
      { question: "How much does carpet cost per square foot?", answer: "About $3–$9 installed with pad for most residential carpet." },
      { question: "How much carpet do I need?", answer: "Measure each room, add 10–15% for seams and waste, and remember carpet comes in 12 ft widths." },
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
