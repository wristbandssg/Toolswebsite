// One-time (but safe to re-run) batch setup script: creates 8 wall decor, lighting and window treatment tools
// from the user's shopping list (Shopping Calculators > Home Improvement Cost & Sizing Calculators).
// See src/lib/calc-engine-shopping-home-decor.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-home-decor-calculators.ts
// or
//   npm run db:create-shopping-home-decor-calculators

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
    slug: "mirror-size-calculator",
    title: "Mirror Size Calculator",
    description: "Find the right mirror size over a bathroom vanity, console, dresser or fireplace — width as a share of the furniture below — and how high to hang it.",
    metaTitle: "Mirror Size Calculator — Vanity & Wall Mirrors",
    metaDescription: "Free mirror size calculator. Find the ideal mirror width for a vanity, console or dresser and the right hanging height.",
    calcInputs: [
      dropdown("location", "Where", [["Over a bathroom vanity", 0], ["Over a console, dresser or mantel", 1]], 0),
      numberField("furnitureWidth", "Vanity / Furniture Width", { unit: "in", default: 48, max: 200, step: 1 }),
      numberField("furnitureHeight", "Vanity / Furniture Height (Incl. Backsplash)", { unit: "in", default: 36, max: 80, step: 0.5 }),
    ],
    calcResult: { label: "Mirror Width", format: "number" },
    calcResults: [
      { key: "idealMirrorWidth", label: "Ideal Mirror Width (in)", format: "number", highlight: true },
      { key: "widthRangeLow", label: "Width Range From (in)", format: "number" },
      { key: "widthRangeHigh", label: "Width Range To (in)", format: "number" },
      { key: "mirrorBottomHeight", label: "Bottom of Mirror From Floor (in)", format: "number" },
      { key: "mirrorCenterHeight", label: "Aim for the Centre at About (in)", format: "number" },
    ],
    instructions: "Choose where the mirror goes and enter the width and height of the vanity or furniture below it (include the backsplash for vanities).",
    examples: "Example: over a 48 in vanity, choose a mirror about 44 in wide (between 34 and 48 in), with its bottom edge around 42 in from the floor.",
    assumptions: "Bathroom mirrors should be no wider than the vanity — a few inches narrower looks best, or one mirror per sink on double vanities. Over furniture, aim for two-thirds to three-quarters of the width, hung 6–10 in above it. " + DESIGN_NOTE,
    faq: [
      { question: "What size mirror for a 36 inch vanity?", answer: "About 30–34 inches wide, so it's slightly narrower than the vanity." },
      { question: "How high should a bathroom mirror hang?", answer: "Its bottom edge 5–10 inches above the sink or backsplash, with the centre near eye level (about 60 inches)." },
    ],
  },
  {
    slug: "chandelier-size-calculator",
    title: "Chandelier Size Calculator",
    description: "Find the right chandelier or light fixture size — diameter from the room's dimensions or the table width, height from the ceiling — and how high to hang it.",
    metaTitle: "Chandelier Size Calculator — Diameter & Height",
    metaDescription: "Free chandelier and light fixture size calculator. Find the right diameter, height and hanging height for your room or dining table.",
    calcInputs: [
      numberField("roomLength", "Room Length", { unit: "ft", default: 14, max: 60, step: 0.5 }),
      numberField("roomWidth", "Room Width", { unit: "ft", default: 12, max: 60, step: 0.5 }),
      numberField("ceilingHeight", "Ceiling Height", { unit: "ft", default: 9, max: 30, step: 0.5 }),
      dropdown("overTable", "Hanging Over a Table or Island?", [["No — centre of the room", 0], ["Yes", 1]], 1),
      numberField("tableWidth", "Table Width", { unit: "in", default: 40, max: 80, step: 1, required: false }),
    ],
    calcResult: { label: "Fixture Diameter", format: "number" },
    calcResults: [
      { key: "fixtureDiameter", label: "Fixture Diameter (in)", format: "number", highlight: true },
      { key: "fixtureHeight", label: "Fixture Height (in)", format: "number" },
      { key: "hangAboveTable", label: "Bottom Above the Table (in)", format: "number" },
      { key: "minClearanceFromFloor", label: "Minimum Clearance in Walkways (in)", format: "number" },
      { key: "chainOrDownrodLength", label: "Approx. Chain / Rod Length (in)", format: "number" },
    ],
    instructions: "Enter the room size and ceiling height. If the fixture hangs over a dining table or island, choose Yes and enter the table's width — the fixture should be narrower than the table.",
    examples: "Example: over a 40 in wide table in a 14 × 12 ft room with a 9 ft ceiling, choose a fixture about 26 in across and 25 in tall, with its bottom 33 in above the table.",
    assumptions: "Diameter (in) ≈ room length + width (ft); over a table about the table width minus 12 in. Height ≈ 2.5–3 in per foot of ceiling. Hang 30–36 in above a table on an 8 ft ceiling, plus 3 in per extra foot; in walkways leave at least 7 ft below the fixture. " + DESIGN_NOTE,
    faq: [
      { question: "What size chandelier for a dining room?", answer: "About half to two-thirds the table's width, or the table width minus 12 inches, so diners don't bump it." },
      { question: "How high should a chandelier hang over a table?", answer: "30–36 inches above the tabletop with an 8 foot ceiling, about 3 inches higher for each extra foot." },
    ],
  },
  {
    slug: "ceiling-fan-size-calculator",
    title: "Ceiling Fan Size Calculator",
    description: "Find the right ceiling fan size for a room — blade span by square footage, downrod length by ceiling height, the airflow (CFM) to look for and when you need two fans.",
    metaTitle: "Ceiling Fan Size Calculator — Blade Span & Downrod",
    metaDescription: "Free ceiling fan size calculator. Find the right blade span for your room, downrod length for your ceiling and minimum CFM airflow.",
    calcInputs: [
      numberField("roomLength", "Room Length", { unit: "ft", default: 15, max: 100, step: 0.5 }),
      numberField("roomWidth", "Room Width", { unit: "ft", default: 13, max: 100, step: 0.5 }),
      numberField("ceilingHeight", "Ceiling Height", { unit: "ft", default: 9, max: 30, step: 0.5 }),
    ],
    calcResult: { label: "Blade Span", format: "number" },
    calcResults: [
      { key: "bladeSpan", label: "Blade Span (in)", format: "number", highlight: true },
      { key: "downrodLength", label: "Downrod Length (in, 0 = Flush Mount)", format: "number" },
      { key: "minimumCfm", label: "Look for at Least (CFM)", format: "number" },
      { key: "fansNeeded", label: "Fans Needed", format: "number" },
      { key: "roomSqFt", label: "Room Size (sq ft)", format: "number" },
    ],
    instructions: "Enter the room's length, width and ceiling height. For long or very large rooms, two smaller fans spread air better than one huge one.",
    examples: "Example: a 15 × 13 ft room (195 sq ft) with a 9 ft ceiling needs a 52 in fan on a 6 in downrod, moving at least 4,000 CFM.",
    assumptions: "Blade span by room size: up to 75 sq ft 29–36 in; 76–144 sq ft 42–48 in; 145–225 sq ft 52–56 in; 226–400 sq ft 56–60 in. Blades should hang 8–9 ft above the floor and at least 18 in from walls. " + DESIGN_NOTE,
    faq: [
      { question: "What size ceiling fan for a 12 × 12 room?", answer: "About a 42–48 inch blade span for 144 square feet." },
      { question: "How long should a ceiling fan downrod be?", answer: "None or a short one on 8 ft ceilings, 6 inches at 9 ft, 12 inches at 10 ft, and about 6 inches more per extra foot." },
    ],
  },
  {
    slug: "wall-art-size-calculator",
    title: "Wall Art Size Calculator",
    description: "Find the right size for wall art and canvas prints — about two-thirds of the furniture below or 57% of a bare wall — and the nearest standard canvas size.",
    metaTitle: "Wall Art Size Calculator — Canvas & Print Size",
    metaDescription: "Free wall art size calculator. Find the ideal art or canvas size above a sofa, bed or console, or for a bare wall, with standard canvas sizes.",
    calcInputs: [
      numberField("furnitureWidth", "Furniture Width Below (0 = Bare Wall)", { unit: "in", default: 84, max: 300, step: 1 }),
      numberField("wallWidth", "Wall Width", { unit: "ft", default: 14, max: 60, step: 0.5, required: false }),
      dropdown("orientation", "Orientation", [["Landscape (wide)", 0], ["Portrait (tall)", 1]], 0),
    ],
    calcResult: { label: "Ideal Art Width", format: "number" },
    calcResults: [
      { key: "idealArtWidth", label: "Ideal Art Width (in)", format: "number", highlight: true },
      { key: "standardCanvasCode", label: "Nearest Canvas (1 11×14, 2 16×20, 3 18×24, 4 24×30, 5 24×36, 6 30×40, 7 36×48, 8 40×60, 9 48×72)", format: "number" },
      { key: "canvasWidth", label: "Canvas Width (in)", format: "number" },
      { key: "canvasHeight", label: "Canvas Height (in)", format: "number" },
      { key: "maxArtWidth", label: "Maximum Art Width (in)", format: "number" },
    ],
    instructions: "Enter the width of the sofa, bed, console or headboard the art hangs above — or 0 for a bare wall, and the wall's width. Choose landscape or portrait.",
    examples: "Example: above an 84 in sofa, art should be about 56 in wide — a 48 × 36 in landscape canvas fits well.",
    assumptions: "Art over furniture looks best at two-thirds to three-quarters of the furniture's width; on a bare wall, about 57–75% of the wall width. A group of pieces can count as one if spaced 2–3 in apart. " + DESIGN_NOTE,
    faq: [
      { question: "What size art should go above a sofa?", answer: "About two-thirds of the sofa's width — roughly 56 inches over an 84 inch sofa." },
      { question: "Is my art too small for the wall?", answer: "If it covers less than about half the furniture width below, it will look lost; add a mat, a bigger frame or more pieces." },
    ],
  },
  {
    slug: "gallery-wall-calculator",
    title: "Gallery Wall Calculator",
    description: "Plan a grid gallery wall — the frame size that fills your space evenly for a set number of rows, columns and spacing — and where to centre it.",
    metaTitle: "Gallery Wall Calculator — Grid Frame Sizes",
    metaDescription: "Free gallery wall calculator. Find the frame size for an even grid gallery wall from the space, rows, columns and spacing.",
    calcInputs: [
      numberField("areaWidth", "Width of the Gallery Area", { unit: "in", default: 60, max: 400, step: 1 }),
      numberField("areaHeight", "Height of the Gallery Area", { unit: "in", default: 40, max: 200, step: 1 }),
      numberField("rows", "Rows", { default: 2, min: 1, max: 10 }),
      numberField("columns", "Columns", { default: 3, min: 1, max: 10 }),
      numberField("spacing", "Space Between Frames", { unit: "in", default: 2.5, max: 12, step: 0.25 }),
    ],
    calcResult: { label: "Frame Width", format: "number" },
    calcResults: [
      { key: "frameWidth", label: "Frame Width (in)", format: "number", highlight: true },
      { key: "frameHeight", label: "Frame Height (in)", format: "number" },
      { key: "framesNeeded", label: "Frames Needed", format: "number" },
      { key: "centerHeight", label: "Centre of the Gallery From Floor (in)", format: "number" },
      { key: "topEdgeHeight", label: "Top Edge From Floor (in)", format: "number" },
    ],
    instructions: "Decide how much wall the gallery should cover (about two-thirds of the furniture below), then the rows, columns and spacing. The result is the frame size for a neat grid.",
    examples: "Example: a 60 × 40 in area in 2 rows of 3 with 2.5 in gaps needs six frames about 18.33 × 18.75 in, centred 57 in from the floor.",
    assumptions: "Spacing of 2–3 in between frames is standard. Centre the whole gallery at eye level (57–60 in) or 8–10 in above furniture. Lay frames out on the floor or tape paper templates to the wall before drilling. " + DESIGN_NOTE,
    faq: [
      { question: "How far apart should gallery wall frames be?", answer: "About 2 to 3 inches apart, kept consistent across the grid." },
      { question: "How high should a gallery wall be?", answer: "Centre it around 57–60 inches from the floor, or start 8–10 inches above a sofa or console." },
    ],
  },
  {
    slug: "picture-hanging-height-calculator",
    title: "Picture Hanging Height Calculator",
    description: "Find exactly where to put the nail so a picture's centre sits at eye level (57 in) — or the right height above a sofa or console — allowing for the wire or hook drop.",
    metaTitle: "Picture Hanging Height Calculator — Nail Height",
    metaDescription: "Free picture hanging height calculator. Find where to put the nail so art is centred at 57 inches or hung correctly above furniture.",
    calcInputs: [
      numberField("frameHeight", "Frame Height", { unit: "in", default: 24, max: 120, step: 0.25 }),
      numberField("hookDrop", "Top of Frame to Taut Wire / Hook", { unit: "in", default: 3, max: 20, step: 0.25 }),
      dropdown("aboveFurniture", "Hanging Above Furniture?", [["No — open wall", 0], ["Yes — sofa, console or bed", 1]], 0),
      numberField("furnitureTop", "Height of Furniture Top", { unit: "in", default: 34, max: 80, step: 0.5, required: false }),
      numberField("centerHeight", "Centre Height (Open Wall)", { unit: "in", default: 57, max: 72, step: 0.5, required: false }),
    ],
    calcResult: { label: "Nail Height", format: "number" },
    calcResults: [
      { key: "nailHeight", label: "Put the Nail At (in From Floor)", format: "number", highlight: true },
      { key: "centerHeight", label: "Picture Centre (in)", format: "number" },
      { key: "topOfFrame", label: "Top of Frame (in)", format: "number" },
      { key: "bottomOfFrame", label: "Bottom of Frame (in)", format: "number" },
    ],
    instructions: "Measure the frame's height and the distance from the top of the frame to the wire pulled tight (or to the hook). On an open wall the picture is centred at 57 in; above furniture its bottom sits about 9 in above it.",
    examples: "Example: a 24 in frame with the wire 3 in below the top, centred at 57 in, needs the nail at 66 in from the floor.",
    assumptions: "Galleries centre art at 57–60 in, average eye level. Above furniture, leave 8–10 in between the furniture and the bottom of the frame. For two hooks, measure the drop to the hook hangers and space them evenly.",
    faq: [
      { question: "How high should you hang pictures?", answer: "With the centre about 57 inches from the floor, the standard used by galleries and museums." },
      { question: "How high above a sofa should a picture hang?", answer: "The bottom of the frame about 8–10 inches above the back of the sofa." },
    ],
  },
  {
    slug: "frame-size-calculator",
    title: "Frame Size Calculator",
    description: "Find the frame size and mat opening for any print or photo — art size plus the mat border you want, with a weighted bottom option — and the nearest standard frame.",
    metaTitle: "Frame Size Calculator — Frame & Mat Opening",
    metaDescription: "Free frame size calculator. Find the frame size and mat opening for any art or photo with your chosen mat border, and the nearest standard frame.",
    calcInputs: [
      numberField("artWidth", "Art Width", { unit: "in", default: 11, max: 100, step: 0.25 }),
      numberField("artHeight", "Art Height", { unit: "in", default: 14, max: 100, step: 0.25 }),
      numberField("matBorder", "Mat Border Width (0 = No Mat)", { unit: "in", default: 2.5, max: 10, step: 0.25 }),
      dropdown("weightedBottom", "Weighted Bottom Mat?", [["No — even border", 0], ["Yes — 1/2 in deeper at the bottom", 1]], 0),
    ],
    calcResult: { label: "Frame Width", format: "number" },
    calcResults: [
      { key: "frameWidth", label: "Frame Size — Width (in)", format: "number", highlight: true },
      { key: "frameHeight", label: "Frame Size — Height (in)", format: "number" },
      { key: "matOpeningWidth", label: "Mat Opening Width (in)", format: "number" },
      { key: "matOpeningHeight", label: "Mat Opening Height (in)", format: "number" },
      { key: "standardFrameCode", label: "Standard Frame (0 Custom, 1 5×7, 2 8×10, 3 11×14, 4 12×16, 5 16×20, 6 18×24, 7 20×24, 8 24×36, 9 30×40)", format: "number" },
    ],
    instructions: "Enter the art's size and the width of mat border you'd like (2–3 in is common). Frame sizes refer to the opening that holds the mat or art.",
    examples: "Example: an 11 × 14 in print with a 2.5 in mat needs a 16 × 19 in frame and a 10.75 × 13.75 in mat opening — standard frame code 5 (16 × 20).",
    assumptions: "Mat openings are cut 1/4 in smaller than the art so the mat overlaps its edges. A weighted bottom makes the lower border slightly deeper, which looks balanced on the wall. Code 0 means you need a custom frame or a bigger standard frame with a wider mat.",
    faq: [
      { question: "What size frame for an 11 × 14 print with a mat?", answer: "A 16 × 20 inch frame with a mat opening of about 10.75 × 13.75 inches." },
      { question: "How wide should a mat be?", answer: "Usually 2–3 inches for small and medium pieces, wider for large art or a dramatic look." },
    ],
  },
  {
    slug: "blind-size-calculator",
    title: "Blind Size Calculator",
    description: "Work out the size to order for window blinds or shades — inside mount (narrowest width) or outside mount (with overlap) — from three width and height measurements.",
    metaTitle: "Blind Size Calculator — Inside or Outside Mount",
    metaDescription: "Free blind size calculator. Find the order width and height for inside or outside mount blinds and shades from your window measurements.",
    calcInputs: [
      dropdown("mount", "Mount", [["Inside the window frame", 0], ["Outside, on the wall or trim", 1]], 0),
      numberField("widthTop", "Width — Top", { unit: "in", default: 34.5, max: 200, step: 0.125 }),
      numberField("widthMiddle", "Width — Middle", { unit: "in", default: 34.375, max: 200, step: 0.125 }),
      numberField("widthBottom", "Width — Bottom", { unit: "in", default: 34.5, max: 200, step: 0.125 }),
      numberField("heightLeft", "Height — Left", { unit: "in", default: 60, max: 200, step: 0.125 }),
      numberField("heightCenter", "Height — Centre", { unit: "in", default: 60.25, max: 200, step: 0.125 }),
      numberField("heightRight", "Height — Right", { unit: "in", default: 60, max: 200, step: 0.125 }),
      numberField("overlap", "Overlap Each Side (Outside Mount)", { unit: "in", default: 3, max: 12, step: 0.25, required: false }),
    ],
    calcResult: { label: "Order Width", format: "number" },
    calcResults: [
      { key: "orderWidth", label: "Order Width (in)", format: "number", highlight: true },
      { key: "orderHeight", label: "Order Height (in)", format: "number" },
      { key: "measuredWidth", label: "Width Used (in)", format: "number" },
      { key: "measuredHeight", label: "Height Used (in)", format: "number" },
      { key: "minDepthForInsideMount", label: "Window Depth Needed for Inside Mount (in, Approx.)", format: "number" },
    ],
    instructions: "Measure the width at the top, middle and bottom and the height at the left, centre and right, to the nearest 1/8 in, with a steel tape. Choose inside mount (in the frame) or outside mount (covering the frame).",
    examples: "Example: for an inside mount, order the narrowest width — 34.38 in — and the longest height, 60.25 in; the factory makes the small deduction for clearance.",
    assumptions: "Inside mount: give the narrowest width and the longest height exactly — don't deduct; manufacturers take off about 1/4–1/2 in. Outside mount: add 1.5–3 in on each side and at the top and bottom to block light. Many blinds need about 2 in of window depth to mount inside.",
    faq: [
      { question: "Do I deduct anything for inside mount blinds?", answer: "No — give your exact narrowest measurement; the manufacturer makes the deduction." },
      { question: "How much bigger should outside mount blinds be?", answer: "About 3 inches wider on each side and 3 inches taller top and bottom for privacy and light control." },
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
