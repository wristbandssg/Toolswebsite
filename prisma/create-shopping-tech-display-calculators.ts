// One-time (but safe to re-run) batch setup script: creates 7 screen, TV and projector tools
// from the user's shopping list (Shopping Calculators > Electronics, Energy & Tech Calculators).
// See src/lib/calc-engine-shopping-tech-display.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-tech-display-calculators.ts
// or
//   npm run db:create-shopping-tech-display-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Electronics, Energy & Tech Calculators", slug: "electronics-energy-tech-calculators" };

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

const ASPECTS: [string, number][] = [["16:9", 0], ["16:10", 1], ["21:9 ultrawide", 2], ["32:9 super ultrawide", 3], ["4:3", 4], ["3:2", 5], ["2.35:1 cinemascope", 6]];

const TOOLS: ToolDef[] = [
  {
    slug: "monitor-ppi-calculator",
    title: "Monitor PPI Calculator",
    description: "Find a monitor's or phone's pixel density (PPI) from its resolution and screen size, plus dot pitch, screen width and height, and the distance where pixels disappear.",
    metaTitle: "Monitor PPI Calculator — Pixels per Inch",
    metaDescription: "Free monitor PPI calculator. Find pixel density, dot pitch, screen dimensions and the viewing distance where pixels disappear for any screen.",
    calcInputs: [
      numberField("widthPx", "Horizontal Resolution", { unit: "px", default: 2560, max: 20000 }),
      numberField("heightPx", "Vertical Resolution", { unit: "px", default: 1440, max: 20000 }),
      numberField("diagonal", "Screen Size (Diagonal)", { unit: "in", default: 27, max: 200, step: 0.1 }),
    ],
    calcResult: { label: "PPI", format: "number" },
    calcResults: [
      { key: "ppi", label: "Pixel Density (PPI)", format: "number", highlight: true },
      { key: "dotPitchMm", label: "Dot Pitch (mm)", format: "number", decimals: 3 },
      { key: "retinaDistanceIn", label: "Pixels Disappear Beyond (in)", format: "number" },
      { key: "screenWidthIn", label: "Screen Width (in)", format: "number" },
      { key: "screenHeightIn", label: "Screen Height (in)", format: "number" },
      { key: "totalMegapixels", label: "Total Megapixels", format: "number" },
    ],
    instructions: "Enter the screen's resolution and diagonal size. Compare PPI across monitors of different sizes — more PPI means sharper text at the same distance.",
    examples: "Example: a 27 inch 2560 × 1440 monitor has 108.79 PPI; at more than about 31.6 inches away, individual pixels are no longer visible to normal vision.",
    assumptions: "PPI = √(width² + height²) ÷ diagonal. The 'retina' distance uses 1 arc-minute of visual acuity (20/20 vision): distance ≈ 3,438 ÷ PPI inches. Scaling settings change how sharp text looks in practice.",
    faq: [
      { question: "What is a good PPI for a monitor?", answer: "Around 90–110 PPI at normal desk distance is fine; 140+ PPI (like 27 inch 4K) looks very sharp with scaling." },
      { question: "Is 1440p sharp on a 27 inch monitor?", answer: "Yes — about 109 PPI, a popular balance of sharpness and performance for gaming and work." },
    ],
  },
  {
    slug: "screen-dimensions-calculator",
    title: "Screen Dimensions Calculator",
    description: "Find the width, height and area of a TV, monitor or projector screen from its diagonal size and aspect ratio — in inches and centimetres.",
    metaTitle: "Screen Dimensions Calculator — Width & Height",
    metaDescription: "Free screen dimensions calculator. Find the width, height and area of any screen from its diagonal and aspect ratio, in inches and cm.",
    calcInputs: [
      numberField("diagonal", "Diagonal Size", { unit: "in", default: 65, max: 300, step: 0.1 }),
      dropdown("aspect", "Aspect Ratio", ASPECTS, 0),
    ],
    calcResult: { label: "Width", format: "number" },
    calcResults: [
      { key: "widthIn", label: "Screen Width (in)", format: "number", highlight: true },
      { key: "heightIn", label: "Screen Height (in)", format: "number" },
      { key: "areaSqIn", label: "Screen Area (sq in)", format: "number" },
      { key: "widthCm", label: "Width (cm)", format: "number" },
      { key: "heightCm", label: "Height (cm)", format: "number" },
    ],
    instructions: "Enter the diagonal screen size and choose the aspect ratio. These are the visible screen dimensions — the TV or monitor body is a little larger because of the bezel and stand.",
    examples: "Example: a 65 inch 16:9 TV's screen is 56.65 in wide and 31.87 in tall (143.9 × 80.94 cm).",
    assumptions: "Width = diagonal × aspect width ÷ √(width² + height²); height likewise. Advertised sizes are rounded, so the real diagonal may be slightly smaller (for example 64.5 in for a '65 inch' TV). Check the product spec sheet for exact body dimensions.",
    faq: [
      { question: "How wide is a 65 inch TV?", answer: "About 56.7 inches of screen width (57 inches with bezels) and 31.9 inches tall." },
      { question: "Is a 34 inch ultrawide bigger than a 27 inch monitor?", answer: "It's wider (about 31 in vs 23.5 in) but only a little taller (about 13.4 in vs 13.2 in)." },
    ],
  },
  {
    slug: "tv-size-calculator",
    title: "TV Size Calculator",
    description: "Find the best TV size for your viewing distance — using SMPTE and THX viewing-angle guidelines adjusted for 1080p, 4K or 8K — and the closest common TV size.",
    metaTitle: "TV Size Calculator — Best TV Size for Distance",
    metaDescription: "Free TV size calculator. Find the best TV size for your seating distance and resolution using SMPTE and THX viewing angles.",
    calcInputs: [
      numberField("distanceFt", "Viewing Distance (Eyes to Screen)", { unit: "ft", default: 9, max: 40, step: 0.5 }),
      dropdown("resolution", "Resolution", [["1080p HD", 0], ["4K", 1], ["8K", 2]], 1),
    ],
    calcResult: { label: "Recommended TV Size", format: "number" },
    calcResults: [
      { key: "recommendedTvSize", label: "Recommended TV Size (in)", format: "number", highlight: true },
      { key: "idealDiagonal", label: "Ideal Diagonal (in)", format: "number" },
      { key: "minimumComfortable", label: "Minimum for Good Immersion (in)", format: "number" },
      { key: "maximumImmersive", label: "Cinema-Like Maximum (in)", format: "number" },
    ],
    instructions: "Measure from where your eyes will be to the TV wall, and choose the resolution. 4K and 8K TVs can be bigger for the same distance without looking soft.",
    examples: "Example: sitting 9 ft away from a 4K TV, aim for about 78.13 in — a 75 inch TV — anywhere from 66.26 to 90 in feels good.",
    assumptions: "SMPTE recommends the screen fill about 30° of your view (diagonal ≈ distance ÷ 1.63); THX recommends about 40° for a cinema feel (distance ÷ 1.2). For 1080p we stay near SMPTE so the picture stays sharp. Room size, budget and wall space matter too.",
    faq: [
      { question: "What size TV should I get for 10 feet?", answer: "For 4K, roughly 75–85 inches; 65 inches is the minimum for good immersion at 10 feet." },
      { question: "Can a TV be too big?", answer: "Only if it overwhelms the room or you can see pixels — with 4K at normal distances, most people prefer going bigger." },
    ],
  },
  {
    slug: "tv-mounting-height-calculator",
    title: "TV Mounting Height Calculator",
    description: "Find how high to mount a TV — the centre, bottom and top heights from seated eye level — for a living room, bedroom or above a fireplace, with the tilt needed.",
    metaTitle: "TV Mounting Height Calculator — How High to Mount",
    metaDescription: "Free TV mounting height calculator. Find the right TV centre, bottom and top heights for living rooms, bedrooms and above fireplaces.",
    calcInputs: [
      numberField("tvSize", "TV Size", { unit: "in", default: 65, max: 120 }),
      numberField("eyeHeight", "Seated Eye Height", { unit: "in", default: 42, max: 70, step: 0.5 }),
      dropdown("room", "Room", [["Living room (seated)", 0], ["Bedroom (watching from bed)", 1], ["Above a fireplace", 2]], 0),
      numberField("mantelHeight", "Top of Mantel (Fireplace Only)", { unit: "in", default: 54, max: 100, step: 0.5, required: false }),
      numberField("distanceFt", "Viewing Distance", { unit: "ft", default: 10, max: 40, step: 0.5, required: false }),
    ],
    calcResult: { label: "Centre Height", format: "number" },
    calcResults: [
      { key: "centerHeight", label: "Centre of TV From Floor (in)", format: "number", highlight: true },
      { key: "bottomEdgeHeight", label: "Bottom Edge From Floor (in)", format: "number" },
      { key: "topEdgeHeight", label: "Top Edge From Floor (in)", format: "number" },
      { key: "tvHeightIn", label: "TV Screen Height (in)", format: "number" },
      { key: "tiltDegrees", label: "Downward Tilt to Use (Degrees)", format: "number" },
    ],
    instructions: "Enter the TV size and your eye height when seated (measure it — usually 38–44 inches on a sofa). Choose the room; for a fireplace, enter the mantel height. Then find the bracket position from the mount's instructions.",
    examples: "Example: a 65 inch TV in a living room with 42 in eye height should be centred at 42 in — the bottom edge about 26.07 in off the floor.",
    assumptions: "Best practice puts the screen's centre at seated eye level (or the bottom third of the screen at eye level). Bedrooms add a few inches for viewing from pillows; fireplace mounts sit above the mantel and should tilt down. Screen height uses a 16:9 panel.",
    faq: [
      { question: "How high should a 65 inch TV be mounted?", answer: "With the centre around 42 inches from the floor for a typical sofa — the bottom edge about 26 inches up." },
      { question: "Is mounting a TV above a fireplace bad?", answer: "It's often too high for comfortable viewing and can expose the TV to heat; a pull-down mount or a tilt helps." },
    ],
  },
  {
    slug: "projector-throw-distance-calculator",
    title: "Projector Throw Distance Calculator",
    description: "Find how far to place a projector from the screen — the distance range from its throw ratio — for a chosen image size and aspect ratio.",
    metaTitle: "Projector Throw Distance Calculator",
    metaDescription: "Free projector throw distance calculator. Find how far to place a projector for your screen size from its throw ratio range.",
    calcInputs: [
      numberField("screenDiagonal", "Image Size (Diagonal)", { unit: "in", default: 120, max: 500 }),
      dropdown("aspect", "Aspect Ratio", ASPECTS, 0),
      numberField("throwMin", "Throw Ratio — Minimum (Wide Zoom)", { default: 1.3, max: 10, step: 0.01 }),
      numberField("throwMax", "Throw Ratio — Maximum (Tele Zoom)", { default: 2.1, max: 10, step: 0.01, required: false }),
    ],
    calcResult: { label: "Minimum Distance", format: "number" },
    calcResults: [
      { key: "minDistanceFt", label: "Closest Distance (ft)", format: "number", highlight: true },
      { key: "maxDistanceFt", label: "Farthest Distance (ft)", format: "number" },
      { key: "distanceFromScreenCenterFt", label: "Middle of the Zoom Range (ft)", format: "number" },
      { key: "imageWidthIn", label: "Image Width (in)", format: "number" },
      { key: "imageHeightIn", label: "Image Height (in)", format: "number" },
    ],
    instructions: "Enter the image size you want and its aspect ratio, then the projector's throw ratio range from its spec sheet (for a fixed-lens projector, enter one ratio in both).",
    examples: "Example: a 120 inch 16:9 image with a 1.3–2.1 throw ratio needs the projector between 11.33 and 18.3 ft from the screen.",
    assumptions: "Throw distance = throw ratio × image width. Distances are measured from the lens to the screen. Short-throw projectors (ratio below about 0.8) and ultra-short-throw (below 0.4) sit very close. Avoid relying on keystone correction, which reduces sharpness.",
    faq: [
      { question: "What is throw ratio?", answer: "The distance from projector to screen divided by the image width — a 1.5 ratio puts a 100 inch wide image 150 inches away." },
      { question: "How far should a projector be for a 100 inch screen?", answer: "About 9–14 feet for a typical 1.2–1.9 throw ratio home theater projector." },
    ],
  },
  {
    slug: "projector-screen-size-calculator",
    title: "Projector Screen Size Calculator",
    description: "Find the biggest projector screen that fits your room — limited by seating distance, wall width and ceiling height — with its width and height.",
    metaTitle: "Projector Screen Size Calculator — Best Size",
    metaDescription: "Free projector screen size calculator. Find the largest screen for your seating distance, wall width and ceiling height, with dimensions.",
    calcInputs: [
      numberField("viewingDistanceFt", "Seating Distance From Screen", { unit: "ft", default: 12, max: 50, step: 0.5 }),
      numberField("wallWidthFt", "Wall Width", { unit: "ft", default: 14, max: 60, step: 0.5 }),
      numberField("ceilingHeightFt", "Ceiling Height", { unit: "ft", default: 8, max: 30, step: 0.5 }),
      dropdown("aspect", "Screen Aspect Ratio", ASPECTS, 0),
    ],
    calcResult: { label: "Screen Size", format: "number" },
    calcResults: [
      { key: "screenDiagonal", label: "Recommended Screen Size (Diagonal in)", format: "number", highlight: true },
      { key: "screenWidthIn", label: "Screen Width (in)", format: "number" },
      { key: "screenHeightIn", label: "Screen Height (in)", format: "number" },
      { key: "limitedBy", label: "Limited By (1 Seating Distance, 2 Wall Width, 3 Ceiling Height)", format: "number" },
    ],
    instructions: "Enter how far the main seats are from the screen, and the width and ceiling height of the screen wall. The size leaves 12 in on each side, 24 in above the floor and 24 in of margin at the top.",
    examples: "Example: seats 12 ft away on a 14 ft wide wall with an 8 ft ceiling suit about a 98 inch 16:9 screen (85.33 × 48 in) — limited by code 3.",
    assumptions: "Distance limit uses THX's 40° viewing angle (diagonal ≈ distance ÷ 1.2). The bottom of the screen should be about 24 in off the floor so heads don't block it. Projector brightness also limits how big a bright image can be.",
    faq: [
      { question: "What size projector screen should I get?", answer: "About your seating distance (in inches) divided by 1.2 for a cinema feel — 12 feet away suits a 120 inch screen — as long as it fits the wall." },
      { question: "How high should a projector screen be?", answer: "The bottom edge about 24–36 inches off the floor, with the screen's lower third near seated eye level." },
    ],
  },
  {
    slug: "projector-brightness-calculator",
    title: "Projector Brightness Calculator",
    description: "Find how many lumens a projector needs for your screen size, screen gain and room lighting — dark theater, dim room or living room with some light.",
    metaTitle: "Projector Brightness Calculator — Lumens Needed",
    metaDescription: "Free projector brightness calculator. Find the ANSI lumens you need for your screen size, screen gain and room light level.",
    calcInputs: [
      numberField("screenDiagonal", "Screen Size (Diagonal)", { unit: "in", default: 120, max: 500 }),
      dropdown("aspect", "Aspect Ratio", ASPECTS, 0),
      numberField("screenGain", "Screen Gain", { default: 1, min: 0.5, max: 3, step: 0.05 }),
      dropdown("roomLight", "Room Light", [["Dark room / dedicated theater", 0], ["Dim room, lights low", 1], ["Some ambient light / daytime", 2]], 1),
    ],
    calcResult: { label: "Lumens Needed", format: "number" },
    calcResults: [
      { key: "lumensNeeded", label: "ANSI Lumens Needed", format: "number", highlight: true },
      { key: "withLampAgingLumens", label: "With 30% Margin for Aging & Eco Mode", format: "number" },
      { key: "screenAreaSqFt", label: "Screen Area (sq ft)", format: "number" },
      { key: "targetFootLamberts", label: "Target Brightness (Foot-Lamberts)", format: "number" },
    ],
    instructions: "Enter the screen size, aspect ratio and the screen's gain (1.0 for matte white), and how dark the room will be. Compare the result with the projector's ANSI lumen rating.",
    examples: "Example: a 120 inch 16:9 screen with 1.0 gain in a dim room needs about 1,282 ANSI lumens — around 1,666 to allow for lamp ageing and eco mode.",
    assumptions: "Lumens = target foot-lamberts × screen area (sq ft) ÷ gain. Targets: about 16 fL for dark theaters (SMPTE cinema standard), 30 fL for dim rooms and 50 fL with ambient light. Ambient-light-rejecting screens help in bright rooms. Lamp projectors lose brightness with age.",
    faq: [
      { question: "How many lumens do I need for a projector?", answer: "About 1,500–2,500 ANSI lumens for a 100–120 inch screen in a dark room, and 3,000+ with lights on." },
      { question: "What is screen gain?", answer: "How much light a screen reflects compared with a matte white surface; gain above 1.0 looks brighter but narrows viewing angles." },
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
