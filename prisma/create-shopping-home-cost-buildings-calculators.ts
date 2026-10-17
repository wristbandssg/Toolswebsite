// One-time (but safe to re-run) batch setup script: creates 15 buildings cost tools
// from the user's shopping list (Shopping Calculators > Home Improvement Cost & Sizing Calculators).
// See src/lib/calc-engine-shopping-home-cost-buildings.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-home-cost-buildings-calculators.ts
// or
//   npm run db:create-shopping-home-cost-buildings-calculators

import { PrismaClient, Prisma } from "@prisma/client";
import { realEstateCategoryIdFor } from "./real-estate-structure";

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
    slug: "home-addition-cost-calculator",
    title: "Home Addition Cost Calculator",
    description: "Estimate home addition cost by size and type — basic room, mid-range or primary suite with bath — with second-story work, demolition, design and permits.",
    metaTitle: "Home Addition Cost Calculator — 2026 Prices",
    metaDescription: "Free home addition cost calculator. Estimate home addition cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Addition Size", { unit: "sq ft", default: 400, max: 5000, step: 1 }),
      dropdown("tier", "Option", [["Basic room", 0], ["Mid-range", 1], ["Primary suite with bath", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Ground floor", 1], ["Second story", 1.2], ["Difficult foundation / site", 1.35]], 1),
      currencyField("removalPerUnit", "Demolition per sq ft", { default: 3, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Design & Permits", { default: 8000, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the addition size and choose the option you want. Then pick the job complexity, add the cost of demolition and include design & permits.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 400 sq ft with the mid-range option (second story) comes to about $121,200.00 — $303.00 per sq ft including extras — with typical quotes between $103,020.00 and $145,440.00.",
    assumptions: "Typical 2026 costs: $150–$250 per sq ft for basic additions and $300–$500+ for kitchens, baths and second stories. Matching existing rooflines and finishes adds cost. Budget a 10–20% contingency." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a home addition cost?", answer: "Most cost $80,000–$200,000; a 400 sq ft room addition is often $80,000–$120,000." },
      { question: "Is it cheaper to build up or out?", answer: "Building out is usually cheaper per sq ft unless your lot is small; second stories need structural work." },
    ],
  },
  {
    slug: "barndominium-cost-calculator",
    title: "Barndominium Cost Calculator",
    description: "Estimate barndominium cost by size — shell kit, basic turnkey or high-end — with site preparation, utilities, septic, well and permits.",
    metaTitle: "Barndominium Cost Calculator — 2026 Prices",
    metaDescription: "Free barndominium cost calculator. Estimate barndominium cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Living Area", { unit: "sq ft", default: 2400, max: 10000, step: 1 }),
      dropdown("tier", "Option", [["Shell / kit only", 0], ["Turnkey basic", 1], ["High-end turnkey", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Flat, cleared lot", 1], ["Some site work", 1.1], ["Remote or sloped", 1.25]], 1),
      currencyField("removalPerUnit", "Site Prep per sq ft", { default: 3, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Utilities, Septic, Well & Permits", { default: 25000, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the living area and choose the option you want. Then pick the job complexity, add the cost of site prep and include utilities, septic, well & permits.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 2,400 sq ft with the turnkey basic option (some site work) comes to about $296,200.00 — $123.42 per sq ft including extras — with typical quotes between $251,770.00 and $355,440.00.",
    assumptions: "Typical 2026 costs: $40–$80 per sq ft for the shell and $100–$200+ per sq ft turnkey. Land, driveways and utility hookups are often the biggest surprises. Check zoning and lender rules for metal homes." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a barndominium cost?", answer: "Commonly $250,000–$450,000 turnkey for 2,400 sq ft, before land." },
      { question: "Are barndominiums cheaper than houses?", answer: "Often 10–30% cheaper per sq ft for the shell, but finish choices can close the gap." },
    ],
  },
  {
    slug: "garage-cost-calculator",
    title: "Garage Cost Calculator",
    description: "Estimate the cost to build a garage by floor area — basic detached, finished or attached — with site prep, doors, electrical and permits.",
    metaTitle: "Garage Cost Calculator — 2026 Prices",
    metaDescription: "Free garage cost calculator. Estimate garage cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Garage Floor Area", { unit: "sq ft", default: 576, max: 5000, step: 1 }),
      dropdown("tier", "Option", [["Basic detached", 0], ["Standard finished", 1], ["Attached / living-space ready", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Level lot", 1], ["Some grading", 1.1], ["Slope or retaining", 1.25]], 1),
      currencyField("removalPerUnit", "Site Prep per sq ft", { default: 2, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Doors, Electrical & Permits", { default: 5000, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the garage floor area and choose the option you want. Then pick the job complexity, add the cost of site prep and include doors, electrical & permits.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 576 sq ft with the standard finished option (some grading) comes to about $49,352.00 — $85.68 per sq ft including extras — with typical quotes between $41,949.20 and $59,222.40.",
    assumptions: "Typical 2026 costs: $50–$80 per sq ft for detached garages and $80–$120+ for attached or finished ones. A 24 × 24 ft two-car garage is usually $35,000–$60,000. Upstairs living space costs much more." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a 2-car garage cost to build?", answer: "Usually $35,000–$60,000 for a 24 × 24 ft detached garage." },
      { question: "Is an attached or detached garage cheaper?", answer: "Attached garages share a wall but need fire separation and matching finishes, so costs are similar." },
    ],
  },
  {
    slug: "garage-door-cost-calculator",
    title: "Garage Door Cost Calculator",
    description: "Estimate garage door replacement cost — uninsulated steel, insulated steel or wood carriage-house doors — with size, removal and a new opener.",
    metaTitle: "Garage Door Cost Calculator — 2026 Prices",
    metaDescription: "Free garage door cost calculator. Estimate garage door cost by door and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Number of Doors", { unit: "doors", default: 1, max: 6, step: 0.5 }),
      dropdown("tier", "Option", [["Single uninsulated steel", 0], ["Double insulated steel", 1], ["Wood / carriage-house custom", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Standard size", 1], ["Taller / wider", 1.1], ["Custom size & windows", 1.2]], 1),
      currencyField("removalPerUnit", "Old Door Removal (Each)", { default: 150, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Opener", { default: 500, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Door (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the number of doors and choose the option you want. Then pick the job complexity, add the cost of old door removal (each) and include opener.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 1 doors with the double insulated steel option (taller / wider) comes to about $2,550.00 — $2,550.00 per door including extras — with typical quotes between $2,167.50 and $3,060.00.",
    assumptions: "Typical 2026 installed prices: single steel doors $1,000–$1,800, insulated doubles $1,800–$3,500, wood and custom $4,000–$8,000+. Openers cost $400–$900 installed. Insulation helps attached garages stay comfortable." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a new garage door cost?", answer: "About $1,500–$3,500 installed for most steel doors; custom wood doors cost more." },
      { question: "Is an insulated garage door worth it?", answer: "For attached or heated garages, yes — it's quieter, stronger and saves energy." },
    ],
  },
  {
    slug: "carport-cost-calculator",
    title: "Carport Cost Calculator",
    description: "Estimate carport cost by area — metal kits, custom steel or attached wood — with footings, enclosed sides, site prep and permits.",
    metaTitle: "Carport Cost Calculator — 2026 Prices",
    metaDescription: "Free carport cost calculator. Estimate carport cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Carport Area", { unit: "sq ft", default: 400, max: 3000, step: 1 }),
      dropdown("tier", "Option", [["Metal kit", 0], ["Custom steel, installed", 1], ["Attached wood carport", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Level ground", 1], ["Concrete footings needed", 1.1], ["Enclosed sides", 1.25]], 1),
      currencyField("removalPerUnit", "Site Prep per sq ft", { default: 2, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Permit & Anchors", { default: 400, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the carport area and choose the option you want. Then pick the job complexity, add the cost of site prep and include permit & anchors.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 400 sq ft with the custom steel, installed option (concrete footings needed) comes to about $9,200.00 — $23.00 per sq ft including extras — with typical quotes between $7,820.00 and $11,040.00.",
    assumptions: "Typical 2026 prices: metal carports $3,000–$6,000 for a two-car size, wood $8,000–$15,000. A concrete slab adds $6–$10 per sq ft. Wind and snow ratings matter in storm-prone areas." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a carport cost?", answer: "About $3,000–$8,000 for a two-car metal carport installed." },
      { question: "Do carports need a permit?", answer: "Often yes, especially for permanent or attached structures." },
    ],
  },
  {
    slug: "shed-cost-calculator",
    title: "Shed Cost Calculator",
    description: "Estimate shed cost by floor area — prefab resin or metal, installed wood prefab, or custom built — with foundation, electrical and permits.",
    metaTitle: "Shed Cost Calculator — 2026 Prices",
    metaDescription: "Free shed cost calculator. Estimate shed cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Shed Floor Area", { unit: "sq ft", default: 120, max: 1000, step: 1 }),
      dropdown("tier", "Option", [["Prefab resin / metal", 0], ["Wood prefab, installed", 1], ["Custom built", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Level site", 1], ["Some leveling", 1.1], ["Slope / difficult access", 1.25]], 1),
      currencyField("removalPerUnit", "Foundation per sq ft", { default: 6, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Electrical & Permit", { default: 300, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the shed floor area and choose the option you want. Then pick the job complexity, add the cost of foundation and include electrical & permit.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 120 sq ft with the wood prefab, installed option (some leveling) comes to about $6,420.00 — $53.50 per sq ft including extras — with typical quotes between $5,457.00 and $7,704.00.",
    assumptions: "Typical 2026 costs: $20–$30 per sq ft for prefab resin and metal, $40–$60 for installed wood sheds, $70–$100+ for custom. Gravel pads cost $3–$6 and concrete slabs $6–$10 per sq ft." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a 10 × 12 shed cost?", answer: "About $3,000–$7,000 for a wood shed installed, more for custom builds." },
      { question: "Does a shed need a foundation?", answer: "Yes — at least a level gravel pad or skids; larger sheds may need a concrete slab." },
    ],
  },
  {
    slug: "pole-barn-cost-calculator",
    title: "Pole Barn Cost Calculator",
    description: "Estimate pole barn cost by floor area — basic kit, turnkey enclosed or insulated and finished — with site prep, doors and permits.",
    metaTitle: "Pole Barn Cost Calculator — 2026 Prices",
    metaDescription: "Free pole barn cost calculator. Estimate pole barn cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Barn Floor Area", { unit: "sq ft", default: 1200, max: 20000, step: 1 }),
      dropdown("tier", "Option", [["Basic kit", 0], ["Turnkey enclosed", 1], ["Insulated / finished", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Level site", 1], ["Some grading", 1.1], ["Remote / sloped", 1.2]], 1),
      currencyField("removalPerUnit", "Site Prep per sq ft", { default: 2, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Doors & Permits", { default: 4000, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the barn floor area and choose the option you want. Then pick the job complexity, add the cost of site prep and include doors & permits.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 1,200 sq ft with the turnkey enclosed option (some grading) comes to about $48,400.00 — $40.33 per sq ft including extras — with typical quotes between $41,140.00 and $58,080.00.",
    assumptions: "Typical 2026 costs: $20–$30 per sq ft for kits, $30–$45 turnkey and $50–$80+ insulated with finished interiors. Concrete floors add about $6–$10 per sq ft." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a pole barn cost?", answer: "About $35,000–$60,000 turnkey for a 30 × 40 ft barn." },
      { question: "Is a pole barn cheaper than a stick-built garage?", answer: "Usually yes — fewer foundations and less framing make pole barns cheaper per sq ft." },
    ],
  },
  {
    slug: "tiny-house-cost-calculator",
    title: "Tiny House Cost Calculator",
    description: "Estimate tiny house cost by size — DIY, builder basic or luxury custom — on wheels or a foundation, with utilities and land setup.",
    metaTitle: "Tiny House Cost Calculator — 2026 Prices",
    metaDescription: "Free tiny house cost calculator. Estimate tiny house cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Tiny House Size", { unit: "sq ft", default: 250, max: 600, step: 1 }),
      dropdown("tier", "Option", [["DIY build", 0], ["Builder basic", 1], ["Luxury custom", 2]], 1),
      dropdown("complexity", "Job Complexity", [["On wheels", 1], ["On a foundation", 1.1], ["Off-grid systems", 1.2]], 1),
      currencyField("fixedCosts", "Utilities & Land Setup", { default: 8000, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the tiny house size and choose the option you want. Then pick the job complexity and include utilities & land setup.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 250 sq ft with the builder basic option (on a foundation) comes to about $95,500.00 — $382.00 per sq ft including extras — with typical quotes between $81,175.00 and $114,600.00.",
    assumptions: "Typical 2026 costs: $30,000–$60,000 DIY, $70,000–$120,000 from a builder and $150,000+ for luxury. Zoning, parking and utility hookups vary widely — check local rules before buying." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a tiny house cost?", answer: "Most professionally built tiny houses cost $70,000–$150,000." },
      { question: "Can I put a tiny house anywhere?", answer: "No — zoning, building codes and RV rules decide where tiny homes can be placed and lived in." },
    ],
  },
  {
    slug: "adu-cost-calculator",
    title: "ADU Cost Calculator",
    description: "Estimate accessory dwelling unit (ADU) cost by size — garage conversion, detached prefab or custom detached — with site work, permits, fees and utility hookups.",
    metaTitle: "ADU Cost Calculator — 2026 Prices",
    metaDescription: "Free adu cost calculator. Estimate adu cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "ADU Size", { unit: "sq ft", default: 600, max: 1200, step: 1 }),
      dropdown("tier", "Option", [["Garage conversion", 0], ["Detached prefab", 1], ["Custom detached", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Simple site", 1], ["Utility trenching", 1.15], ["Slope / tight access", 1.3]], 1),
      currencyField("removalPerUnit", "Site Prep per sq ft", { default: 5, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Permits, Impact Fees & Hookups", { default: 25000, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the adu size and choose the option you want. Then pick the job complexity, add the cost of site prep and include permits, impact fees & hookups.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 600 sq ft with the detached prefab option (utility trenching) comes to about $178,000.00 — $296.67 per sq ft including extras — with typical quotes between $151,300.00 and $213,600.00.",
    assumptions: "Typical 2026 costs: garage conversions $100,000–$150,000, detached prefab $150,000–$250,000, custom detached $250,000–$400,000+ in high-cost areas. Rental income can help repay the build." + " " + REGION_NOTE,
    faq: [
      { question: "How much does an ADU cost?", answer: "Usually $150,000–$300,000 for a detached unit; garage conversions cost less." },
      { question: "Do ADUs add value?", answer: "Yes — they can add rental income and often raise property value, especially in tight housing markets." },
    ],
  },
  {
    slug: "basement-finishing-cost-calculator",
    title: "Basement Finishing Cost Calculator",
    description: "Estimate basement finishing cost by area — basic, mid-range or high-end with a bathroom — with moisture control, waterproofing, permits and egress windows.",
    metaTitle: "Basement Finishing Cost Calculator — 2026 Prices",
    metaDescription: "Free basement finishing cost calculator. Estimate basement finishing cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Basement Area to Finish", { unit: "sq ft", default: 800, max: 5000, step: 1 }),
      dropdown("tier", "Option", [["Basic", 0], ["Mid-range", 1], ["High-end with bathroom", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Dry basement", 1], ["Minor moisture fixes", 1.1], ["Waterproofing needed", 1.3]], 1),
      currencyField("removalPerUnit", "Waterproofing per sq ft", { default: 3, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Permits & Egress Window", { default: 3000, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the basement area to finish and choose the option you want. Then pick the job complexity, add the cost of waterproofing and include permits & egress window.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 800 sq ft with the mid-range option (minor moisture fixes) comes to about $49,400.00 — $61.75 per sq ft including extras — with typical quotes between $41,990.00 and $59,280.00.",
    assumptions: "Typical 2026 costs: $30–$45 per sq ft basic, $50–$65 mid-range and $75–$100+ with a bathroom or kitchenette. A bathroom adds $15,000–$25,000. Fix moisture first." + " " + REGION_NOTE,
    faq: [
      { question: "How much does it cost to finish a basement?", answer: "About $35,000–$70,000 for 800–1,000 sq ft, depending on finishes and bathrooms." },
      { question: "Do I need an egress window?", answer: "Yes, for any basement bedroom; codes require an emergency exit." },
    ],
  },
  {
    slug: "wheelchair-ramp-cost-calculator",
    title: "Wheelchair Ramp Cost Calculator",
    description: "Estimate wheelchair ramp cost by length — wood, aluminum modular or concrete — with turns, landings and permits. Ramp length is about 1 ft per inch of rise.",
    metaTitle: "Wheelchair Ramp Cost Calculator — 2026 Prices",
    metaDescription: "Free wheelchair ramp cost calculator. Estimate wheelchair ramp cost by linear ft of ramp and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Ramp Length (1 ft per Inch of Rise)", { unit: "linear ft", default: 24, max: 200, step: 0.5 }),
      dropdown("tier", "Option", [["Wood", 0], ["Aluminum modular", 1], ["Concrete", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Straight run", 1], ["One turn / landing", 1.1], ["Switchbacks", 1.25]], 1),
      currencyField("fixedCosts", "Landings & Permit", { default: 600, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Linear ft of ramp (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the ramp length (1 ft per inch of rise) and choose the option you want. Then pick the job complexity and include landings & permit.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 24 linear ft with the aluminum modular option (one turn / landing) comes to about $4,680.00 — $195.00 per linear ft of ramp including extras — with typical quotes between $3,978.00 and $5,616.00.",
    assumptions: "ADA guidance is a 1:12 slope — 1 ft of ramp for every inch of rise — with a 5 × 5 ft landing every 30 ft of run and at turns. Typical 2026 costs: wood $100–$150, aluminum $150–$250, concrete $200–$300 per linear ft. Rental aluminum ramps suit short-term needs." + " " + REGION_NOTE,
    faq: [
      { question: "How long does a wheelchair ramp need to be?", answer: "One foot for every inch of rise — a 24 inch step needs a 24 ft ramp under ADA guidelines." },
      { question: "How much does a wheelchair ramp cost?", answer: "About $2,500–$6,000 for a typical home ramp, depending on length and material." },
    ],
  },
  {
    slug: "whole-house-generator-cost-calculator",
    title: "Whole House Generator Cost Calculator",
    description: "Estimate whole-house standby generator cost by size in kW — air-cooled, liquid-cooled or premium — with gas and electric runs, transfer switch and permits.",
    metaTitle: "Whole House Generator Cost Calculator — 2026 Prices",
    metaDescription: "Free whole house generator cost calculator. Estimate whole house generator cost by kW and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Generator Size", { unit: "kW", default: 22, max: 60, step: 0.5 }),
      dropdown("tier", "Option", [["Air-cooled standby", 0], ["Liquid-cooled standby", 1], ["Premium with smart load management", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Gas line nearby", 1], ["Long gas or electric run", 1.15], ["Propane tank & long runs", 1.3]], 1),
      currencyField("fixedCosts", "Transfer Switch, Pad & Permits", { default: 2500, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per KW (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the generator size and choose the option you want. Then pick the job complexity and include transfer switch, pad & permits.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 22 kW with the liquid-cooled standby option (long gas or electric run) comes to about $17,900.00 — $813.64 per kW including extras — with typical quotes between $15,215.00 and $21,480.00.",
    assumptions: "Typical 2026 costs: $10,000–$16,000 installed for a 22 kW air-cooled unit, $18,000–$30,000+ for liquid-cooled models. Size the generator to the loads you need to run; maintenance costs $200–$400 a year." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a whole-house generator cost?", answer: "Usually $10,000–$20,000 installed for a typical home." },
      { question: "What size generator do I need for my house?", answer: "Many homes need 20–24 kW to run central AC and essentials; larger homes may need 26–48 kW." },
    ],
  },
  {
    slug: "chimney-repair-cost-calculator",
    title: "Chimney Repair Cost Calculator",
    description: "Estimate chimney repair cost by the masonry area — tuckpointing, partial rebuild or full rebuild — with roof height, crown, cap and flashing.",
    metaTitle: "Chimney Repair Cost Calculator — 2026 Prices",
    metaDescription: "Free chimney repair cost calculator. Estimate chimney repair cost by sq ft of masonry and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Masonry Area to Repair", { unit: "sq ft", default: 40, max: 500, step: 0.5 }),
      dropdown("tier", "Option", [["Tuckpointing", 0], ["Partial rebuild", 1], ["Full rebuild above roofline", 2]], 1),
      dropdown("complexity", "Job Complexity", [["One story, low pitch", 1], ["Two story", 1.15], ["Steep roof / tall chimney", 1.35]], 1),
      currencyField("fixedCosts", "Crown, Cap & Flashing", { default: 800, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Sq ft of masonry (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the masonry area to repair and choose the option you want. Then pick the job complexity and include crown, cap & flashing.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 40 sq ft with the partial rebuild option (two story) comes to about $3,600.00 — $90.00 per sq ft of masonry including extras — with typical quotes between $3,060.00 and $4,320.00.",
    assumptions: "Typical 2026 costs: tuckpointing $500–$2,500, crown repair $500–$1,500, partial rebuilds $2,000–$5,000, full rebuilds $5,000–$15,000. A chimney liner adds $2,500–$7,000. Get a Level 2 inspection when buying a home." + " " + REGION_NOTE,
    faq: [
      { question: "How much does chimney repair cost?", answer: "Minor repairs cost a few hundred dollars; rebuilding the top of a chimney often costs $3,000–$7,000." },
      { question: "How often should a chimney be inspected?", answer: "At least once a year if you burn wood, according to the NFPA." },
    ],
  },
  {
    slug: "electrician-cost-calculator",
    title: "Electrician Cost Calculator",
    description: "Estimate electrician cost by hours — apprentice, journeyman or master electrician — with after-hours rates, materials, trip fees and permits.",
    metaTitle: "Electrician Cost Calculator — 2026 Prices",
    metaDescription: "Free electrician cost calculator. Estimate electrician cost by hour and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Estimated Hours", { unit: "hours", default: 8, max: 200, step: 0.5 }),
      dropdown("tier", "Option", [["Apprentice / handyman-level", 0], ["Licensed journeyman", 1], ["Master electrician / emergency", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Normal hours", 1], ["Evenings / weekends", 1.25], ["Emergency call-out", 1.5]], 1),
      currencyField("fixedCosts", "Trip Fee, Materials & Permit", { default: 250, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Hour (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the estimated hours and choose the option you want. Then pick the job complexity and include trip fee, materials & permit.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 8 hours with the licensed journeyman option (evenings / weekends) comes to about $1,050.00 — $131.25 per hour including extras — with typical quotes between $892.50 and $1,260.00.",
    assumptions: "Typical 2026 rates: $60–$80 an hour for apprentices, $75–$110 for journeymen, $100–$150+ for master electricians, often with a one- to two-hour minimum. Panel upgrades cost $1,500–$4,000; EV chargers $800–$2,500." + " " + REGION_NOTE,
    faq: [
      { question: "How much does an electrician charge per hour?", answer: "Usually $75–$130 an hour in 2026, plus materials and any trip fee." },
      { question: "Do I need a permit for electrical work?", answer: "Most new circuits, panel changes and remodels need a permit and inspection." },
    ],
  },
  {
    slug: "solar-panel-cost-calculator",
    title: "Solar Panel Cost Calculator",
    description: "Estimate solar panel system cost by size in kW — standard panels, premium panels or panels with battery storage — with roof complexity and permits.",
    metaTitle: "Solar Panel Cost Calculator — 2026 Prices",
    metaDescription: "Free solar panel cost calculator. Estimate solar panel cost by kW and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "System Size", { unit: "kW", default: 8, max: 30, step: 0.5 }),
      dropdown("tier", "Option", [["Standard panels", 0], ["Premium panels", 1], ["Premium with battery storage", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Simple roof", 1], ["Complex roof / multiple planes", 1.1], ["Ground mount or reroof needed", 1.25]], 1),
      currencyField("fixedCosts", "Permits & Interconnection", { default: 1500, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per KW (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the system size and choose the option you want. Then pick the job complexity and include permits & interconnection.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 8 kW with the premium panels option (complex roof / multiple planes) comes to about $27,100.00 — $3,387.50 per kW including extras — with typical quotes between $23,035.00 and $32,520.00.",
    assumptions: "Typical 2026 installed prices: about $2.50–$3.50 per watt before incentives. The 30% federal residential clean energy credit ended for systems installed after 2025, but state, utility and net-metering programs still vary. A home using 10,000 kWh a year needs roughly 6–8 kW." + " " + REGION_NOTE,
    faq: [
      { question: "How much do solar panels cost?", answer: "About $20,000–$28,000 for a typical 8 kW system before any state or utility incentives." },
      { question: "Is there still a federal tax credit for home solar?", answer: "The residential solar credit ended for systems placed in service after December 31, 2025; check state and utility programs." },
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
      categoryId: (await realEstateCategoryIdFor(prisma, def.slug)) ?? (category.id),
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
