// One-time (but safe to re-run) batch setup script: creates 9 furnishing size tools
// from the user's shopping list (Shopping Calculators > Home Improvement Cost & Sizing Calculators).
// See src/lib/calc-engine-shopping-home-furnish.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-home-furnish-calculators.ts
// or
//   npm run db:create-shopping-home-furnish-calculators

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

const DESIGN_NOTE = "These are designers' rules of thumb — measure your space and adjust to taste.";

const TOOLS: ToolDef[] = [
  {
    slug: "curtain-size-calculator",
    title: "Curtain Size Calculator",
    description: "Work out curtain width and length — rod length with extension, total fabric for the fullness you want, how many panels to buy and the standard panel length for sill, floor or puddle hems.",
    metaTitle: "Curtain Size Calculator — Width, Length & Rod",
    metaDescription: "Free curtain size calculator. Find curtain rod length, fabric width, number of panels and the right panel length for your window and hem style.",
    calcInputs: [
      numberField("windowWidth", "Window Width (Outside Trim)", { unit: "in", default: 60, max: 400, step: 0.5 }),
      numberField("windowHeight", "Window Height (Outside Trim)", { unit: "in", default: 60, max: 300, step: 0.5 }),
      numberField("extension", "Rod Extension Past Each Side", { unit: "in", default: 8, max: 24, step: 1 }),
      numberField("mountAbove", "Rod Height Above the Window", { unit: "in", default: 8, max: 36, step: 1 }),
      numberField("windowToFloor", "Bottom of Window to Floor", { unit: "in", default: 24, max: 120, step: 0.5 }),
      dropdown("hem", "Curtain Length", [["To the sill", 0], ["Just below the sill", 1], ["To the floor", 2], ["Puddled on the floor", 3]], 2),
      dropdown("fullness", "Fullness", [["1.5× (light gathering)", 0], ["2× (standard)", 1], ["2.5× (full)", 2], ["3× (sheers)", 3]], 1),
      numberField("panelWidth", "Width of One Panel", { unit: "in", default: 50, max: 120, step: 1 }),
    ],
    calcResult: { label: "Standard Panel Length", format: "number" },
    calcResults: [
      { key: "standardPanelLength", label: "Standard Panel Length to Buy (in)", format: "number", highlight: true },
      { key: "panelsNeeded", label: "Panels Needed", format: "number" },
      { key: "rodLength", label: "Rod Length (in)", format: "number" },
      { key: "totalFabricWidth", label: "Total Curtain Width Needed (in)", format: "number" },
      { key: "exactLength", label: "Exact Length From Rod (in)", format: "number" },
    ],
    instructions:
      "Measure the window width and height including trim, then choose how far the rod extends past each side and how high above the window it's mounted. For floor-length curtains, measure from the bottom of the window to the floor.\n\n" +
      "Pick the length and fullness you like and the width of the panels you're buying.",
    examples: "Example: a 60 × 60 in window with an 8 in extension and the rod 8 in above, 24 in off the floor, needs a 76 in rod, 4 panels at 2× fullness, and 95 in panels for floor length.",
    assumptions: "Mount rods 4–10 in above the window and extend 4–12 in each side so curtains clear the glass when open. Floor-length curtains stop about 1/2 in above the floor; puddled ones add 2–6 in. Standard panel lengths: 63, 84, 95, 108, 120 in. " + DESIGN_NOTE,
    faq: [
      { question: "How wide should curtains be?", answer: "The total width of all panels should be 1.5 to 3 times the rod length — 2× is standard for a full look." },
      { question: "How long should curtains be?", answer: "Most look best just kissing the floor, hung high and wide to make the window look bigger." },
    ],
  },
  {
    slug: "rug-size-calculator",
    title: "Rug Size Calculator",
    description: "Find the right rug size for a room — all furniture on, front legs on or a floating rug — matched to standard rug sizes, with the rug pad size.",
    metaTitle: "Rug Size Calculator — Best Rug Size for a Room",
    metaDescription: "Free rug size calculator. Find the best standard rug size for your room and furniture layout, plus the matching rug pad size.",
    calcInputs: [
      numberField("roomLength", "Room Length", { unit: "ft", default: 14, max: 60, step: 0.5 }),
      numberField("roomWidth", "Room Width", { unit: "ft", default: 12, max: 60, step: 0.5 }),
      dropdown("layout", "Layout", [["All furniture legs on the rug", 0], ["Front legs on the rug", 1], ["Floating rug (only under a coffee table)", 2]], 1),
    ],
    calcResult: { label: "Rug Size", format: "number" },
    calcResults: [
      { key: "rugSizeCode", label: "Rug Size (1 = 3×5, 2 = 4×6, 3 = 5×8, 4 = 6×9, 5 = 8×10, 6 = 9×12, 7 = 10×14, 8 = 12×15 ft)", format: "number", highlight: true },
      { key: "rugWidthFt", label: "Rug Width (ft)", format: "number" },
      { key: "rugLengthFt", label: "Rug Length (ft)", format: "number" },
      { key: "maxRugWidthFt", label: "Largest Rug Width That Fits (ft)", format: "number" },
      { key: "maxRugLengthFt", label: "Largest Rug Length That Fits (ft)", format: "number" },
      { key: "padWidthIn", label: "Rug Pad Width (in)", format: "number" },
      { key: "padLengthIn", label: "Rug Pad Length (in)", format: "number" },
    ],
    instructions: "Enter the room's length and width and choose how the furniture will sit on the rug. The result is the largest standard rug that leaves a border of bare floor around it.",
    examples: "Example: a 14 × 12 ft living room with front legs on the rug suits size code 5 — an 8 × 10 ft rug — with a 94 × 118 in pad.",
    assumptions: "Borders of bare floor: about 18 in per side when all furniture sits on the rug, 2 ft for front-legs-on, more for a floating rug. Rug pads are cut about 1 in smaller than the rug on every side. " + DESIGN_NOTE,
    faq: [
      { question: "What size rug for a 12 × 14 room?", answer: "Usually an 8 × 10 with front legs on, or a 9 × 12 if you want all the furniture on the rug." },
      { question: "How big should a rug pad be?", answer: "About 1 inch shorter than the rug on each side, so the pad stays hidden." },
    ],
  },
  {
    slug: "dining-table-size-calculator",
    title: "Dining Table Size Calculator",
    description: "Find the largest dining table that fits your room while leaving room to pull out chairs and walk around — and how many people it seats, rectangular or round.",
    metaTitle: "Dining Table Size Calculator — Fit & Seating",
    metaDescription: "Free dining table size calculator. Find the best table length and width for your dining room, how many it seats and a round table size.",
    calcInputs: [
      numberField("roomLength", "Room Length", { unit: "ft", default: 14, max: 60, step: 0.5 }),
      numberField("roomWidth", "Room Width", { unit: "ft", default: 11, max: 60, step: 0.5 }),
      numberField("clearance", "Clearance Around the Table", { unit: "in", default: 36, min: 30, max: 60, step: 1 }),
    ],
    calcResult: { label: "Max Table Length", format: "number" },
    calcResults: [
      { key: "maxTableLength", label: "Maximum Table Length (in)", format: "number", highlight: true },
      { key: "maxTableWidth", label: "Table Width (in)", format: "number" },
      { key: "seats", label: "Seats", format: "number" },
      { key: "roundTableDiameter", label: "Or Round Table Up To (in)", format: "number" },
    ],
    instructions: "Enter the room's dimensions (or the area for dining in an open plan) and the clearance you want: 36 in to pull out chairs, 42–48 in for a walkway behind seated guests.",
    examples: "Example: a 14 × 11 ft room with 36 in clearance fits a table up to 96 in long and 42 in wide, seating about 10, or a round table up to 60 in.",
    assumptions: "Allow about 24 in of table edge per person and 36–42 in wide tables; round tables seat about one person per 20–24 in of circumference. " + DESIGN_NOTE,
    faq: [
      { question: "How much space do you need around a dining table?", answer: "At least 36 inches from the table edge to the wall, and 42–48 inches where people walk behind chairs." },
      { question: "What size table seats 6?", answer: "About 60–72 inches long and 36–40 inches wide, or a 54–60 inch round table." },
    ],
  },
  {
    slug: "tablecloth-size-calculator",
    title: "Tablecloth Size Calculator",
    description: "Find the tablecloth size for any rectangular or round table — casual, formal or floor-length drop — matched to standard tablecloth sizes.",
    metaTitle: "Tablecloth Size Calculator — Rectangle & Round",
    metaDescription: "Free tablecloth size calculator. Find the right tablecloth for rectangular or round tables with casual, formal or floor-length drops.",
    calcInputs: [
      dropdown("shape", "Table Shape", [["Rectangular / square / oval", 0], ["Round", 1]], 0),
      numberField("tableLength", "Table Length (or Diameter)", { unit: "in", default: 72, max: 240, step: 1 }),
      numberField("tableWidth", "Table Width", { unit: "in", default: 36, max: 120, step: 1, required: false }),
      dropdown("drop", "Drop", [["Casual (6–8 in)", 0], ["Standard (10 in)", 1], ["Formal (15 in, to the lap)", 2], ["Floor length (29–30 in)", 3]], 1),
    ],
    calcResult: { label: "Standard Length", format: "number" },
    calcResults: [
      { key: "standardLength", label: "Standard Tablecloth Length (in)", format: "number", highlight: true },
      { key: "standardWidth", label: "Standard Tablecloth Width (in)", format: "number" },
      { key: "neededLength", label: "Exact Length Needed (in)", format: "number" },
      { key: "neededWidth", label: "Exact Width Needed (in)", format: "number" },
      { key: "dropInches", label: "Drop Used (in)", format: "number" },
    ],
    instructions: "Choose the table shape and enter its size, then the drop — how far the cloth hangs over each edge. Floor-length cloths are common for events and buffets.",
    examples: "Example: a 72 × 36 in table with a 10 in drop needs a 56 × 92 in cloth, so buy the standard 60 × 102 in size.",
    assumptions: "Tablecloth = table + 2 × drop each way. Standard rectangles: 52×70, 60×84, 60×102, 60×120, 90×132, 90×156 in; rounds: 60, 70, 90, 108, 120, 132 in. Allow for shrinkage with cotton. " + DESIGN_NOTE,
    faq: [
      { question: "What size tablecloth for a 6 foot table?", answer: "For a 72 × 30 in banquet table, a 60 × 102 in cloth gives a standard drop; a 90 × 156 in cloth reaches the floor." },
      { question: "How much should a tablecloth hang over?", answer: "6–10 inches for everyday use, about 15 inches for formal dinners and 29–30 inches to reach the floor." },
    ],
  },
  {
    slug: "sofa-size-calculator",
    title: "Sofa Size Calculator",
    description: "Find the right sofa size for your living room — maximum width for the wall, depth that still leaves a walkway and space for a coffee table — and how many people it seats.",
    metaTitle: "Sofa Size Calculator — What Size Couch Fits",
    metaDescription: "Free sofa size calculator. Find the maximum sofa width and depth for your wall and room, how many it seats and whether a sectional fits.",
    calcInputs: [
      numberField("wallLength", "Wall Length", { unit: "ft", default: 13, max: 60, step: 0.5 }),
      numberField("roomDepth", "Room Depth From That Wall", { unit: "ft", default: 12, max: 60, step: 0.5 }),
      numberField("walkway", "Walkway to Keep Clear", { unit: "in", default: 36, max: 60, step: 1 }),
      dropdown("coffeeTable", "Coffee Table in Front?", [["Yes", 1], ["No", 0]], 1),
    ],
    calcResult: { label: "Max Sofa Width", format: "number" },
    calcResults: [
      { key: "maxSofaWidth", label: "Maximum Sofa Width (in)", format: "number", highlight: true },
      { key: "maxSofaDepth", label: "Maximum Sofa Depth (in)", format: "number" },
      { key: "seats", label: "Seats", format: "number" },
      { key: "sectionalPossible", label: "Room for a Sectional? (1 = Yes)", format: "number" },
    ],
    instructions: "Enter the length of the wall the sofa goes against and the room's depth from that wall, the walkway you want and whether there's a coffee table.",
    examples: "Example: a 13 ft wall and 12 ft deep room fit a sofa up to 104 in wide and 44 in deep, seating about 3.",
    assumptions: "A sofa should take up no more than about two-thirds of its wall. Depth leaves 36 in of walkway, a coffee table with 18 in gap and about 2 ft of space beyond. About 30 in of width per seat. Check doorways and stairs before buying. " + DESIGN_NOTE,
    faq: [
      { question: "How big should a sofa be for my wall?", answer: "Around two-thirds of the wall length, leaving space at each end for side tables or lamps." },
      { question: "How do I know if a sofa will fit through my door?", answer: "Compare the sofa's depth and height (or diagonal depth) with the door width and any tight turns." },
    ],
  },
  {
    slug: "coffee-table-size-calculator",
    title: "Coffee Table Size Calculator",
    description: "Find the right coffee table size for your sofa — about two-thirds of its length, just below seat height, and how far from the sofa to place it.",
    metaTitle: "Coffee Table Size Calculator — Length & Height",
    metaDescription: "Free coffee table size calculator. Find the ideal coffee table length, height and distance from your sofa using designer rules.",
    calcInputs: [
      numberField("sofaLength", "Sofa Length", { unit: "in", default: 84, max: 200, step: 1 }),
      numberField("seatHeight", "Sofa Seat Height", { unit: "in", default: 18, max: 30, step: 0.5 }),
    ],
    calcResult: { label: "Ideal Length", format: "number" },
    calcResults: [
      { key: "idealLength", label: "Ideal Coffee Table Length (in)", format: "number", highlight: true },
      { key: "lengthRangeLow", label: "Length Range From (in)", format: "number" },
      { key: "lengthRangeHigh", label: "Length Range To (in)", format: "number" },
      { key: "tableHeightLow", label: "Table Height From (in)", format: "number" },
      { key: "tableHeightHigh", label: "Table Height To (in)", format: "number" },
      { key: "gapFromSofa", label: "Distance From Sofa (in)", format: "number" },
    ],
    instructions: "Enter your sofa's length and seat height. The coffee table should be shorter than the sofa, close to seat height and within easy reach.",
    examples: "Example: an 84 in sofa with an 18 in seat suits a coffee table about 56 in long (between 42 and 63 in), 16–18 in high, placed about 16 in from the sofa.",
    assumptions: "Designers use about two-thirds of the sofa length (half to three-quarters works), a height level with or 1–2 in below the seat, and 14–18 in of space between sofa and table. " + DESIGN_NOTE,
    faq: [
      { question: "How big should a coffee table be?", answer: "About two-thirds the length of your sofa, and roughly the same height as the seat cushions or slightly lower." },
      { question: "How far should a coffee table be from the sofa?", answer: "14 to 18 inches — close enough to reach a drink, with room for legs." },
    ],
  },
  {
    slug: "furniture-to-room-size-calculator",
    title: "Furniture to Room Size Calculator",
    description: "Check whether your furniture fits a room — how much of the floor it covers, how much free space is left and whether the room will feel open or crowded.",
    metaTitle: "Furniture to Room Size Calculator — Will It Fit?",
    metaDescription: "Free furniture to room size calculator. Add up furniture footprints to see how much floor they cover and whether the room will feel crowded.",
    calcInputs: [
      numberField("roomLength", "Room Length", { unit: "ft", default: 14, max: 100, step: 0.5 }),
      numberField("roomWidth", "Room Width", { unit: "ft", default: 12, max: 100, step: 0.5 }),
      numberField("len1", "Item 1 Length", { unit: "in", default: 84, max: 300 }),
      numberField("wid1", "Item 1 Depth", { unit: "in", default: 38, max: 300 }),
      numberField("len2", "Item 2 Length", { unit: "in", default: 34, max: 300, required: false }),
      numberField("wid2", "Item 2 Depth", { unit: "in", default: 34, max: 300, required: false }),
      numberField("len3", "Item 3 Length", { unit: "in", default: 48, max: 300, required: false }),
      numberField("wid3", "Item 3 Depth", { unit: "in", default: 24, max: 300, required: false }),
      numberField("len4", "Item 4 Length", { unit: "in", default: 60, max: 300, required: false }),
      numberField("wid4", "Item 4 Depth", { unit: "in", default: 18, max: 300, required: false }),
      numberField("len5", "Item 5 Length", { unit: "in", default: 0, max: 300, required: false }),
      numberField("wid5", "Item 5 Depth", { unit: "in", default: 0, max: 300, required: false }),
    ],
    calcResult: { label: "Floor Covered", format: "percentage" },
    calcResults: [
      { key: "floorCoveredPercent", label: "Floor Covered by Furniture", format: "percentage", highlight: true },
      { key: "fitCode", label: "Feel (1 Open, 2 Comfortable, 3 Full, 4 Crowded)", format: "number" },
      { key: "furnitureFootprintSqFt", label: "Furniture Footprint (sq ft)", format: "number" },
      { key: "freeFloorSqFt", label: "Free Floor (sq ft)", format: "number" },
      { key: "roomSqFt", label: "Room Area (sq ft)", format: "number" },
    ],
    instructions: "Enter the room size and the length and depth of up to five pieces of furniture (sofa, chairs, tables, TV stand). Leave unused items at 0.",
    examples: "Example: a sofa, armchair, coffee table and media console in a 14 × 12 ft room cover 27.20% of the floor — fit code 1 — leaving 122.31 sq ft free.",
    assumptions: "As a rough guide, keeping furniture under about 40% of the floor feels open and up to 55% comfortable; above 65% feels crowded. Walkways of 30–36 in matter as much as the total. " + DESIGN_NOTE,
    faq: [
      { question: "How much furniture should a room have?", answer: "Aim to leave at least half the floor visible, with clear 30–36 inch walkways." },
      { question: "How can I plan furniture before buying?", answer: "Mark the pieces' outlines on the floor with painter's tape to check walkways and proportions." },
    ],
  },
  {
    slug: "mattress-size-calculator",
    title: "Mattress Size Calculator",
    description: "Find the right mattress size — twin, twin XL, full, queen, king or California king — for the number of sleepers, their height and kids or pets, and the room size it needs.",
    metaTitle: "Mattress Size Calculator — Which Bed Size?",
    metaDescription: "Free mattress size calculator. Find the right mattress size for sleepers, height and pets, with dimensions and the minimum room size.",
    calcInputs: [
      numberField("sleepers", "Number of Adults Sleeping", { default: 2, min: 1, max: 2 }),
      numberField("tallestHeight", "Tallest Sleeper's Height", { unit: "in", default: 70, max: 96, step: 1 }),
      dropdown("petsOrKids", "Pets or Kids Join You?", [["No", 0], ["Yes", 1]], 0),
      dropdown("sleepStyle", "Sleep Style", [["Still sleepers", 0], ["Restless / like lots of space", 1]], 0),
    ],
    calcResult: { label: "Mattress Size", format: "number" },
    calcResults: [
      { key: "mattressCode", label: "Mattress (1 Twin, 2 Twin XL, 3 Full, 4 Queen, 5 King, 6 California King)", format: "number", highlight: true },
      { key: "mattressWidth", label: "Width (in)", format: "number" },
      { key: "mattressLength", label: "Length (in)", format: "number" },
      { key: "minRoomWidthFt", label: "Minimum Room Width (ft)", format: "number" },
      { key: "minRoomLengthFt", label: "Minimum Room Length (ft)", format: "number" },
    ],
    instructions: "Enter how many adults share the bed, the tallest sleeper's height, and whether children or pets join you or you like extra space.",
    examples: "Example: two still sleepers up to 5'10\" suit mattress code 4 — a queen, 60 × 80 in — needing a room at least 9 × 9.67 ft.",
    assumptions: "Mattress length should be about 6 in longer than the tallest sleeper (California king for people over about 6'4\"). Leave 24 in on both sides and 36 in at the foot for walking. US sizes: twin 38×75, twin XL 38×80, full 54×75, queen 60×80, king 76×80, Cal king 72×84 in.",
    faq: [
      { question: "Is a queen big enough for two people?", answer: "For most couples, yes — each gets 30 inches of width. Restless sleepers or families with pets may prefer a king." },
      { question: "What room size do you need for a king bed?", answer: "At least about 10 × 10 feet, and 12 × 12 feet or more to fit nightstands comfortably." },
    ],
  },
  {
    slug: "bar-stool-height-calculator",
    title: "Bar Stool Height Calculator",
    description: "Find the right bar or counter stool height for your counter, bar or table — 10 to 12 inches below the surface — and how many stools fit along it.",
    metaTitle: "Bar Stool Height Calculator — Counter vs Bar",
    metaDescription: "Free bar stool height calculator. Find the right stool seat height for your counter or bar and how many stools fit along it.",
    calcInputs: [
      numberField("counterHeight", "Counter / Bar Height", { unit: "in", default: 36, max: 50, step: 0.5 }),
      numberField("counterLength", "Length Available for Seating", { unit: "in", default: 96, max: 600, step: 1 }),
      numberField("stoolWidth", "Stool Seat Width", { unit: "in", default: 18, max: 36, step: 0.5 }),
      numberField("spacing", "Space Between Stools", { unit: "in", default: 8, max: 20, step: 1 }),
    ],
    calcResult: { label: "Seat Height", format: "number" },
    calcResults: [
      { key: "seatHeight", label: "Ideal Seat Height (in)", format: "number", highlight: true },
      { key: "seatHeightLow", label: "Seat Height From (in)", format: "number" },
      { key: "seatHeightHigh", label: "Seat Height To (in)", format: "number" },
      { key: "stoolsThatFit", label: "Stools That Fit", format: "number" },
      { key: "stoolTypeCode", label: "Stool Type (1 Dining/Standard, 2 Counter Height, 3 Bar Height)", format: "number" },
    ],
    instructions: "Measure from the floor to the top of the counter or bar, the length available for seating, and the width of the stools you like.",
    examples: "Example: a 36 in kitchen counter needs stools with about a 25 in seat (stool type 2, counter height). A 96 in counter fits 4 stools of 18 in with 8 in between.",
    assumptions: "Leave 10–12 in between the seat and the underside of the counter for your legs. Counter-height stools (24–26 in) suit 35–37 in counters; bar-height stools (28–30 in) suit 40–42 in bars. Allow about 26 in per stool, more for swivel or arm stools. " + DESIGN_NOTE,
    faq: [
      { question: "What height stool for a 36 inch counter?", answer: "A counter-height stool with a 24–26 inch seat." },
      { question: "What's the difference between counter and bar stools?", answer: "Counter stools have 24–26 inch seats for 36 inch counters; bar stools have 28–30 inch seats for 42 inch bars." },
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
