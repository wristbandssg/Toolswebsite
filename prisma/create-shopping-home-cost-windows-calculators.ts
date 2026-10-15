// One-time (but safe to re-run) batch setup script: creates 10 windows cost tools
// from the user's shopping list (Shopping Calculators > Home Improvement Cost & Sizing Calculators).
// See src/lib/calc-engine-shopping-home-cost-windows.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-home-cost-windows-calculators.ts
// or
//   npm run db:create-shopping-home-cost-windows-calculators

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
    slug: "window-replacement-cost-calculator",
    title: "Window Replacement Cost Calculator",
    description: "Estimate window replacement cost by the number of windows — vinyl, fiberglass or wood-clad, or premium wood — with upper floors, custom shapes, removal and trim.",
    metaTitle: "Window Replacement Cost Calculator — 2026 Prices",
    metaDescription: "Free window replacement cost calculator. Estimate window replacement cost by window and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Number of Windows", { unit: "windows", default: 10, max: 100, step: 0.5 }),
      dropdown("tier", "Option", [["Vinyl double-hung", 0], ["Fiberglass / wood-clad", 1], ["Premium wood / triple pane", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Standard sizes, first floor", 1], ["Upper floors", 1.1], ["Bay, bow or custom shapes", 1.3]], 1),
      currencyField("removalPerUnit", "Old Window Removal (Each)", { default: 50, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Trim & Disposal", { default: 300, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Window (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the number of windows and choose the option you want. Then pick the job complexity, add the cost of old window removal (each) and include trim & disposal.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 10 windows with the fiberglass / wood-clad option (upper floors) comes to about $11,300.00 — $1,130.00 per window including extras — with typical quotes between $9,605.00 and $13,560.00.",
    assumptions: "Typical 2026 installed prices: vinyl $500–$900, fiberglass and wood-clad $900–$1,400, premium wood $1,300–$2,000+ per window. Full-frame replacements cost more than inserts. Federal energy-efficient window credits ended after 2025." + " " + REGION_NOTE,
    faq: [
      { question: "How much does it cost to replace a window?", answer: "About $600–$1,200 per window installed for most vinyl and fiberglass windows." },
      { question: "Insert or full-frame replacement?", answer: "Inserts fit in the old frame and cost less; full-frame replacements fix rotten frames and add more glass." },
    ],
  },
  {
    slug: "window-screen-replacement-cost-calculator",
    title: "Window Screen Replacement Cost Calculator",
    description: "Estimate window screen replacement cost — rescreening, new frames or solar, pet-proof and retractable screens — by the number of screens.",
    metaTitle: "Window Screen Replacement Cost Calculator — 2026 Prices",
    metaDescription: "Free window screen replacement cost calculator. Estimate window screen replacement cost by screen and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Number of Screens", { unit: "screens", default: 10, max: 100, step: 0.5 }),
      dropdown("tier", "Option", [["Rescreen existing frame", 0], ["New frame & screen", 1], ["Solar, pet-proof or retractable", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Standard sizes", 1], ["Large / custom sizes", 1.1], ["Upper floors", 1.25]], 1),
      currencyField("fixedCosts", "Service Call", { default: 75, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Screen (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the number of screens and choose the option you want. Then pick the job complexity and include service call.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 10 screens with the new frame & screen option (large / custom sizes) comes to about $575.00 — $57.50 per screen including extras — with typical quotes between $488.75 and $690.00.",
    assumptions: "Typical 2026 prices: rescreening $20–$40, new screens $40–$70, solar and pet screens $60–$120 and retractable screens $150–$300+ each. DIY rescreening kits cost a few dollars per window." + " " + REGION_NOTE,
    faq: [
      { question: "How much does it cost to replace a window screen?", answer: "About $25–$70 per standard screen, more for custom or retractable screens." },
      { question: "Can I rescreen windows myself?", answer: "Yes — with a roll of mesh, spline and a spline roller it takes about 15 minutes per screen." },
    ],
  },
  {
    slug: "home-window-tint-cost-calculator",
    title: "Home Window Tint Cost Calculator",
    description: "Estimate residential window tint cost by glass area — privacy, ceramic low-e or security film — with upper floors and old film removal.",
    metaTitle: "Home Window Tint Cost Calculator — 2026 Prices",
    metaDescription: "Free home window tint cost calculator. Estimate home window tint cost by sq ft of glass and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Glass Area", { unit: "sq ft", default: 150, max: 5000, step: 1 }),
      dropdown("tier", "Option", [["Basic dyed / privacy film", 0], ["Ceramic / low-e film", 1], ["Security / decorative film", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Ground floor", 1], ["Upper floors", 1.15], ["Skylights / hard to reach", 1.3]], 1),
      currencyField("removalPerUnit", "Old Film Removal per sq ft", { default: 1.5, max: 100000, step: 0.05, required: false }),
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
    instructions: "Enter the glass area and choose the option you want. Then pick the job complexity and add the cost of old film removal.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 150 sq ft with the ceramic / low-e film option (upper floors) comes to about $1,725.00 — $11.50 per sq ft of glass including extras — with typical quotes between $1,466.25 and $2,070.00.",
    assumptions: "Typical 2026 installed prices: $5–$8 per sq ft for basic films, $8–$12 for ceramic and low-e, $12–$20 for security film. Check window maker warranties — some films can void them on dual-pane glass." + " " + REGION_NOTE,
    faq: [
      { question: "How much does home window tinting cost?", answer: "About $5–$15 per square foot installed, so $750–$2,250 for 150 sq ft of glass." },
      { question: "Does window film lower energy bills?", answer: "Solar-control and low-e films can cut cooling costs and reduce fading, especially on sunny windows." },
    ],
  },
  {
    slug: "blinds-cost-calculator",
    title: "Blinds Cost Calculator",
    description: "Estimate window blinds cost by the number of windows — vinyl, faux wood, real wood or motorized cellular shades — with custom sizes and installation.",
    metaTitle: "Blinds Cost Calculator — 2026 Prices",
    metaDescription: "Free blinds cost calculator. Estimate blinds cost by window and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Number of Windows", { unit: "windows", default: 10, max: 100, step: 0.5 }),
      dropdown("tier", "Option", [["Vinyl / aluminum", 0], ["Faux wood", 1], ["Real wood or motorized cellular", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Standard sizes", 1], ["Custom sizes", 1.1], ["Large / specialty windows", 1.2]], 1),
      currencyField("fixedCosts", "Measuring & Service", { default: 100, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Window (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the number of windows and choose the option you want. Then pick the job complexity and include measuring & service.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 10 windows with the faux wood option (custom sizes) comes to about $1,100.00 — $110.00 per window including extras — with typical quotes between $935.00 and $1,320.00.",
    assumptions: "Typical 2026 installed prices: vinyl $40–$70, faux wood $80–$150, real wood $150–$300, motorized $300–$600+ per window. Big-box custom blinds are cheaper than designer brands." + " " + REGION_NOTE,
    faq: [
      { question: "How much do blinds cost?", answer: "About $50–$150 per window installed for most vinyl and faux-wood blinds." },
      { question: "Faux wood or real wood blinds?", answer: "Faux wood resists moisture (good for kitchens and baths); real wood is lighter for large windows." },
    ],
  },
  {
    slug: "shutters-cost-calculator",
    title: "Shutters Cost Calculator",
    description: "Estimate shutter cost by the number of windows — interior vinyl or wood plantation shutters, or exterior functional shutters — with specialty shapes.",
    metaTitle: "Shutters Cost Calculator — 2026 Prices",
    metaDescription: "Free shutters cost calculator. Estimate shutters cost by window and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Number of Windows", { unit: "windows", default: 8, max: 100, step: 0.5 }),
      dropdown("tier", "Option", [["Vinyl / composite plantation", 0], ["Wood plantation", 1], ["Exterior functional shutters", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Standard windows", 1], ["Arches / specialty shapes", 1.15], ["Upper floors", 1.3]], 1),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Window (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the number of windows and choose the option you want. Then pick the job complexity.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 8 windows with the wood plantation option (arches / specialty shapes) comes to about $4,000.00 — $500.00 per window including extras — with typical quotes between $3,400.00 and $4,800.00.",
    assumptions: "Typical 2026 installed prices: vinyl and composite plantation shutters $250–$400, wood $350–$600, exterior functional shutters $500–$1,000 per window. Decorative exterior shutters cost much less." + " " + REGION_NOTE,
    faq: [
      { question: "How much do plantation shutters cost?", answer: "About $25–$50 per square foot installed, or $300–$600 per average window." },
      { question: "Do plantation shutters add home value?", answer: "They're one of the few window treatments often considered a fixture that adds appeal for buyers." },
    ],
  },
  {
    slug: "curtain-cost-calculator",
    title: "Curtain Cost Calculator",
    description: "Estimate curtain and custom drapery cost by the number of windows — ready-made, made-to-measure or custom lined drapes — with rods and motorized tracks.",
    metaTitle: "Curtain Cost Calculator — 2026 Prices",
    metaDescription: "Free curtain cost calculator. Estimate curtain cost by window and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Number of Windows", { unit: "windows", default: 6, max: 50, step: 0.5 }),
      dropdown("tier", "Option", [["Ready-made curtains", 0], ["Made-to-measure", 1], ["Custom lined drapery", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Standard rods", 1], ["Upgraded hardware", 1.15], ["Motorized tracks", 1.3]], 1),
      currencyField("fixedCosts", "Design Consultation", { default: 150, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Window (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the number of windows and choose the option you want. Then pick the job complexity and include design consultation.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 6 windows with the made-to-measure option (upgraded hardware) comes to about $1,950.00 — $325.00 per window including extras — with typical quotes between $1,657.50 and $2,340.00.",
    assumptions: "Typical 2026 prices per window: ready-made $50–$150, made-to-measure $200–$400, custom lined drapery $500–$1,000+. Interlining, blackout linings and designer fabrics add cost." + " " + REGION_NOTE,
    faq: [
      { question: "How much do custom drapes cost?", answer: "About $500–$1,000 per window for lined custom drapery, including hardware and installation." },
      { question: "Are custom curtains worth it?", answer: "For tall or unusual windows and a tailored look, yes; ready-made panels work well for standard windows." },
    ],
  },
  {
    slug: "glass-price-calculator",
    title: "Glass Price Calculator",
    description: "Estimate custom glass and mirror cost by area — clear annealed, tempered or mirror and low-e — with edge work, holes and installation.",
    metaTitle: "Glass Price Calculator — 2026 Prices",
    metaDescription: "Free glass price calculator. Estimate glass cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Glass Area", { unit: "sq ft", default: 12, max: 500, step: 0.5 }),
      dropdown("tier", "Option", [["Clear annealed (1/4 in)", 0], ["Tempered safety glass", 1], ["Mirror / low-e glass", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Straight cuts", 1], ["Polished or beveled edges", 1.1], ["Holes, notches & shapes", 1.25]], 1),
      currencyField("fixedCosts", "Delivery & Installation", { default: 100, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the glass area and choose the option you want. Then pick the job complexity and include delivery & installation.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 12 sq ft with the tempered safety glass option (polished or beveled edges) comes to about $352.00 — $29.33 per sq ft including extras — with typical quotes between $299.20 and $422.40.",
    assumptions: "Typical 2026 prices: clear 1/4 in glass $10–$15, tempered $18–$25, mirror $15–$30 per sq ft. Tempered glass is required in doors, showers and near floors. Table tops and shelves need polished edges." + " " + REGION_NOTE,
    faq: [
      { question: "How much does custom glass cost?", answer: "About $10–$25 per square foot depending on type, thickness and edge work." },
      { question: "When is tempered glass required?", answer: "In doors, shower enclosures and windows near floors, tubs or stairs, under building codes." },
    ],
  },
  {
    slug: "bifold-door-cost-calculator",
    title: "Bifold Door Cost Calculator",
    description: "Estimate bifold door cost by the number of doors — hollow-core, solid or louvered, or glass and mirrored — with sizing and removal.",
    metaTitle: "Bifold Door Cost Calculator — 2026 Prices",
    metaDescription: "Free bifold door cost calculator. Estimate bifold door cost by door and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Number of Doors", { unit: "doors", default: 3, max: 30, step: 0.5 }),
      dropdown("tier", "Option", [["Hollow-core", 0], ["Solid wood or louvered", 1], ["Glass or mirrored", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Standard size", 1], ["Custom size", 1.1], ["Out-of-square opening", 1.2]], 1),
      currencyField("removalPerUnit", "Old Door Removal (Each)", { default: 25, max: 100000, step: 0.05, required: false }),
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
    instructions: "Enter the number of doors and choose the option you want. Then pick the job complexity and add the cost of old door removal (each).\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 3 doors with the solid wood or louvered option (custom size) comes to about $1,035.00 — $345.00 per door including extras — with typical quotes between $879.75 and $1,242.00.",
    assumptions: "Typical 2026 installed prices: hollow-core $150–$250, solid wood $300–$450, glass and mirrored $450–$700 per door. Wide closets need double bifold sets." + " " + REGION_NOTE,
    faq: [
      { question: "How much does it cost to install a bifold door?", answer: "About $200–$500 per door installed for most closet bifolds." },
      { question: "Can bifold doors be installed in any closet?", answer: "Most closets with a standard opening can take bifolds; they need clear floor space to fold." },
    ],
  },
  {
    slug: "sliding-door-cost-calculator",
    title: "Sliding Door Cost Calculator",
    description: "Estimate sliding patio door cost — vinyl, fiberglass or premium multi-slide — with replacement or new openings, removal, trim and hardware.",
    metaTitle: "Sliding Door Cost Calculator — 2026 Prices",
    metaDescription: "Free sliding door cost calculator. Estimate sliding door cost by door and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Number of Doors", { unit: "doors", default: 1, max: 10, step: 0.5 }),
      dropdown("tier", "Option", [["Vinyl patio door", 0], ["Fiberglass", 1], ["Multi-slide / premium", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Same-size replacement", 1], ["Resize opening", 1.25], ["New opening (structural)", 1.6]], 1),
      currencyField("removalPerUnit", "Old Door Removal (Each)", { default: 150, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Trim & Hardware", { default: 300, max: 1000000, step: 10, required: false }),
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
    instructions: "Enter the number of doors and choose the option you want. Then pick the job complexity, add the cost of old door removal (each) and include trim & hardware.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 1 doors with the fiberglass option (resize opening) comes to about $3,250.00 — $3,250.00 per door including extras — with typical quotes between $2,762.50 and $3,900.00.",
    assumptions: "Typical 2026 installed prices: vinyl $1,500–$2,500, fiberglass $2,500–$4,000, multi-slide systems $6,000–$15,000+. Creating a new opening needs a header and permit." + " " + REGION_NOTE,
    faq: [
      { question: "How much does a sliding glass door cost?", answer: "About $1,500–$4,000 installed for most standard patio doors." },
      { question: "How long do sliding doors last?", answer: "Typically 20–30 years; rollers and tracks may need replacing sooner." },
    ],
  },
  {
    slug: "office-furniture-cost-calculator",
    title: "Office Furniture Cost Calculator",
    description: "Estimate office furniture cost by workstations — budget, mid-range or premium ergonomic — with installation, removal, delivery and space planning.",
    metaTitle: "Office Furniture Cost Calculator — 2026 Prices",
    metaDescription: "Free office furniture cost calculator. Estimate office furniture cost by workstation and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Number of Workstations", { unit: "workstations", default: 10, max: 500, step: 0.5 }),
      dropdown("tier", "Option", [["Budget (desk, chair, storage)", 0], ["Mid-range", 1], ["Premium ergonomic", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Simple layout", 1], ["Panels & cabling", 1.05], ["Complex / phased install", 1.1]], 1),
      currencyField("removalPerUnit", "Old Furniture Removal (Each)", { default: 50, max: 100000, step: 0.05, required: false }),
      currencyField("fixedCosts", "Delivery & Space Planning", { default: 800, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Workstation (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the number of workstations and choose the option you want. Then pick the job complexity, add the cost of old furniture removal (each) and include delivery & space planning.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 10 workstations with the mid-range option (panels & cabling) comes to about $14,300.00 — $1,430.00 per workstation including extras — with typical quotes between $12,155.00 and $17,160.00.",
    assumptions: "Typical 2026 costs per workstation: $500–$800 budget, $1,000–$1,800 mid-range, $2,000–$4,000+ premium with sit-stand desks and task chairs. Conference rooms and reception areas are extra. Used furniture can cut costs by half." + " " + REGION_NOTE,
    faq: [
      { question: "How much does office furniture cost per employee?", answer: "About $1,000–$2,500 per workstation for good-quality furniture." },
      { question: "Should I buy new or used office furniture?", answer: "Used furniture can save 40–60%, especially for desks and filing; buy chairs new for comfort and warranty." },
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
