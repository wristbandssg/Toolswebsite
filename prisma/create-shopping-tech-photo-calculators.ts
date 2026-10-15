// One-time (but safe to re-run) batch setup script: creates 7 photography tools
// from the user's shopping list (Shopping Calculators > Electronics, Energy & Tech Calculators).
// See src/lib/calc-engine-shopping-tech-photo.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-tech-photo-calculators.ts
// or
//   npm run db:create-shopping-tech-photo-calculators

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

const SENSORS: [string, number][] = [["Full frame (36 × 24 mm)", 0], ["APS-C — Nikon, Sony, Fujifilm (1.5×)", 1], ["APS-C — Canon (1.6×)", 2], ["Micro Four Thirds (2×)", 3], ["1-inch (2.7×)", 4], ["Large phone sensor (1/1.3 in)", 5]];

const TOOLS: ToolDef[] = [
  {
    slug: "field-of-view-calculator",
    title: "Field Of View Calculator",
    description: "Find a lens's angle of view — horizontal, vertical and diagonal — on any camera sensor, and how wide the frame is at a given distance, from the focal length.",
    metaTitle: "Field of View Calculator — Lens Angle of View",
    metaDescription: "Free field of view calculator. Find a lens's horizontal, vertical and diagonal angle of view and frame size at any distance for your sensor.",
    calcInputs: [
      numberField("focalLength", "Focal Length", { unit: "mm", default: 35, max: 2000, step: 1 }),
      dropdown("sensor", "Sensor", SENSORS, 0),
      numberField("distanceM", "Subject Distance (for Frame Size)", { unit: "m", default: 5, max: 10000, step: 0.1, required: false }),
    ],
    calcResult: { label: "Horizontal FOV", format: "number" },
    calcResults: [
      { key: "horizontalFov", label: "Horizontal Angle of View (°)", format: "number", highlight: true },
      { key: "verticalFov", label: "Vertical Angle of View (°)", format: "number" },
      { key: "diagonalFov", label: "Diagonal Angle of View (°)", format: "number" },
      { key: "frameWidthM", label: "Frame Width at Distance (m)", format: "number" },
      { key: "frameHeightM", label: "Frame Height at Distance (m)", format: "number" },
    ],
    instructions: "Enter the lens's focal length and choose the camera's sensor size. Add a subject distance to see how much of the scene fits in the frame — useful when choosing a lens.",
    examples: "Example: a 35 mm lens on full frame sees 54.43° horizontally; at 5 m it frames an area about 5.14 × 3.43 m.",
    assumptions: "Angle of view = 2 × arctan(sensor dimension ÷ (2 × focal length)), for rectilinear lenses focused at infinity. Fisheye lenses and close focusing (focus breathing) change it.",
    faq: [
      { question: "What is the field of view of a 50mm lens?", answer: "About 40° horizontally and 47° diagonally on full frame; about 27° horizontally on APS-C." },
      { question: "Does a smaller sensor change the field of view?", answer: "Yes — it crops the image, so the same lens shows a narrower view, like a longer focal length." },
    ],
  },
  {
    slug: "depth-of-field-calculator",
    title: "Depth Of Field Calculator",
    description: "Calculate depth of field — the near and far limits of acceptable sharpness — from focal length, aperture, focus distance and sensor size.",
    metaTitle: "Depth of Field Calculator — Near & Far Focus",
    metaDescription: "Free depth of field calculator. Find the near and far limits of sharp focus and total depth of field from focal length, aperture and distance.",
    calcInputs: [
      numberField("focalLength", "Focal Length", { unit: "mm", default: 50, max: 2000, step: 1 }),
      numberField("aperture", "Aperture (f-number)", { default: 2.8, min: 0.7, max: 64, step: 0.1 }),
      numberField("distanceM", "Focus Distance", { unit: "m", default: 3, max: 10000, step: 0.1 }),
      dropdown("sensor", "Sensor", SENSORS, 0),
    ],
    calcResult: { label: "Total Depth of Field", format: "number" },
    calcResults: [
      { key: "totalDofM", label: "Total Depth of Field (m; 9999 = to Infinity)", format: "number", highlight: true },
      { key: "nearLimitM", label: "Near Limit of Sharpness (m)", format: "number" },
      { key: "farLimitM", label: "Far Limit of Sharpness (m; 9999 = Infinity)", format: "number" },
      { key: "inFrontM", label: "Sharp Zone in Front of Subject (m)", format: "number" },
      { key: "behindM", label: "Sharp Zone Behind Subject (m)", format: "number" },
      { key: "farIsInfinity", label: "Sharp to Infinity? (1 = Yes)", format: "number" },
    ],
    instructions: "Enter the lens focal length, aperture, the distance you're focused at and your sensor size. Wider apertures, longer lenses and closer focus give shallower depth of field.",
    examples: "Example: a 50 mm lens at f/2.8 focused at 3 m on full frame keeps about 0.58 m sharp — from 2.74 m to 3.32 m.",
    assumptions: "Uses the standard thin-lens formulas with a circle of confusion of the sensor diagonal ÷ 1,500 (about 0.029 mm on full frame). Sharpness is gradual, and viewing size changes what looks 'acceptably sharp'.",
    faq: [
      { question: "What affects depth of field?", answer: "Aperture, focal length, focus distance and sensor size — a wide aperture and close focus give the shallowest focus." },
      { question: "Does a smaller sensor give more depth of field?", answer: "At the same framing and f-number, yes — that's why phones keep most of a scene sharp." },
    ],
  },
  {
    slug: "hyperfocal-distance-calculator",
    title: "Hyperfocal Distance Calculator",
    description: "Find the hyperfocal distance — where to focus so everything from half that distance to infinity is acceptably sharp — for landscapes and street photography.",
    metaTitle: "Hyperfocal Distance Calculator — Landscape Focus",
    metaDescription: "Free hyperfocal distance calculator. Find where to focus to keep everything sharp to infinity for any lens, aperture and sensor.",
    calcInputs: [
      numberField("focalLength", "Focal Length", { unit: "mm", default: 24, max: 2000, step: 1 }),
      numberField("aperture", "Aperture (f-number)", { default: 8, min: 0.7, max: 64, step: 0.1 }),
      dropdown("sensor", "Sensor", SENSORS, 0),
    ],
    calcResult: { label: "Hyperfocal Distance", format: "number" },
    calcResults: [
      { key: "hyperfocalM", label: "Hyperfocal Distance (m)", format: "number", highlight: true },
      { key: "nearestSharpM", label: "Sharp From (m) to Infinity", format: "number" },
      { key: "hyperfocalFt", label: "Hyperfocal Distance (ft)", format: "number" },
      { key: "circleOfConfusionMm", label: "Circle of Confusion Used (mm)", format: "number", decimals: 3 },
    ],
    instructions: "Enter the focal length, aperture and sensor size, then focus at the hyperfocal distance. Everything from half that distance to infinity will be acceptably sharp.",
    examples: "Example: a 24 mm lens at f/8 on full frame has a hyperfocal distance of 2.52 m — focus there and everything from 1.26 m to infinity is sharp.",
    assumptions: "Hyperfocal distance H = f² ÷ (N × c) + f, with c = sensor diagonal ÷ 1,500. For critical sharpness at large print sizes, use a smaller circle of confusion or focus a little beyond H.",
    faq: [
      { question: "What is hyperfocal distance?", answer: "The closest focus distance that still keeps infinity acceptably sharp, maximizing depth of field." },
      { question: "Should landscapes always use hyperfocal focusing?", answer: "It's a great starting point; for important distant detail, focus slightly beyond the hyperfocal distance or focus stack." },
    ],
  },
  {
    slug: "crop-factor-calculator",
    title: "Crop Factor Calculator",
    description: "Find your camera sensor's crop factor and size, and the full-frame equivalent focal length and aperture of any lens on APS-C, Micro Four Thirds, 1-inch or phone sensors.",
    metaTitle: "Crop Factor Calculator — Full-Frame Equivalent",
    metaDescription: "Free crop factor calculator. Find sensor size, crop factor and full-frame equivalent focal length and aperture for APS-C, MFT and more.",
    calcInputs: [
      dropdown("sensor", "Camera Sensor", SENSORS, 1),
      numberField("focalLength", "Lens Focal Length", { unit: "mm", default: 35, max: 2000, step: 1 }),
      numberField("aperture", "Lens Aperture (f-number)", { default: 1.8, min: 0.7, max: 64, step: 0.1 }),
    ],
    calcResult: { label: "Crop Factor", format: "number" },
    calcResults: [
      { key: "cropFactor", label: "Crop Factor", format: "number", highlight: true },
      { key: "equivalentFocalLength", label: "Full-Frame Equivalent Focal Length (mm)", format: "number" },
      { key: "equivalentAperture", label: "Equivalent Aperture for Depth of Field (f/)", format: "number" },
      { key: "sensorWidthMm", label: "Sensor Width (mm)", format: "number" },
      { key: "sensorHeightMm", label: "Sensor Height (mm)", format: "number" },
      { key: "sensorAreaVsFullFrame", label: "Sensor Area vs Full Frame", format: "percentage" },
    ],
    instructions: "Choose your camera's sensor and enter the lens's focal length and aperture to see the full-frame equivalents.",
    examples: "Example: a 35 mm f/1.8 lens on a Nikon/Sony/Fuji APS-C camera (crop factor 1.53) frames like a 53.69 mm lens on full frame, with the depth of field of about f/2.76.",
    assumptions: "Crop factor = full-frame diagonal (43.27 mm) ÷ sensor diagonal. Exposure (brightness) at a given f-number does not change with crop factor — only framing and depth of field equivalence do.",
    faq: [
      { question: "What is crop factor?", answer: "How much smaller a sensor is than full frame, measured by the diagonal — 1.5× for most APS-C and 2× for Micro Four Thirds." },
      { question: "Does crop factor change aperture?", answer: "Not exposure — f/1.8 is as bright on any sensor — but depth of field matches a full-frame lens about one crop factor slower." },
    ],
  },
  {
    slug: "photography-exposure-calculator",
    title: "Photography Exposure Calculator",
    description: "Calculate the exposure value (EV) of your settings and find the equivalent shutter speed when you change aperture or ISO — for ND filters, bracketing and manual exposure.",
    metaTitle: "Exposure Calculator — EV & Equivalent Settings",
    metaDescription: "Free photography exposure calculator. Find the exposure value of your settings and the equivalent shutter speed at a new aperture or ISO.",
    calcInputs: [
      numberField("aperture", "Current Aperture (f-number)", { default: 8, min: 0.7, max: 64, step: 0.1 }),
      numberField("shutterSeconds", "Current Shutter Speed (Seconds, e.g. 0.004 = 1/250)", { default: 0.004, min: 0.00001, max: 3600, step: 0.0001 }),
      numberField("iso", "Current ISO", { default: 100, min: 25, max: 409600 }),
      numberField("newAperture", "New Aperture", { default: 2.8, min: 0.7, max: 64, step: 0.1 }),
      numberField("newIso", "New ISO", { default: 100, min: 25, max: 409600 }),
    ],
    calcResult: { label: "Exposure Value", format: "number" },
    calcResults: [
      { key: "exposureValue", label: "Exposure Value (EV at ISO 100)", format: "number", highlight: true },
      { key: "newShutterSeconds", label: "New Shutter Speed (Seconds)", format: "number", decimals: 5 },
      { key: "newShutterFraction", label: "New Shutter Speed as 1/x (x)", format: "number" },
      { key: "stopsChange", label: "Shutter Change (Stops)", format: "number" },
    ],
    instructions: "Enter a correctly exposed combination of aperture, shutter speed and ISO, then the new aperture and ISO you want. The calculator keeps the same exposure and gives the matching shutter speed.",
    examples: "Example: f/8 at 1/250 s and ISO 100 is 13.97 EV (bright overcast to sun). Opening up to f/2.8 at ISO 100 needs about 1/2,041 s.",
    assumptions: "EV = log₂(N² ÷ t) − log₂(ISO ÷ 100). Each stop doubles or halves the light. For ND filters, enter the filter's stops as a shutter change (for example ×1,000 for a 10-stop ND). Results are exact; cameras round to their available speeds.",
    faq: [
      { question: "What is exposure value?", answer: "A single number for combinations of aperture and shutter speed that give the same exposure — each EV step is one stop of light." },
      { question: "What is the sunny 16 rule?", answer: "In bright sun, at f/16 the shutter speed is about 1/ISO — 1/100 s at ISO 100, about EV 15." },
    ],
  },
  {
    slug: "timelapse-calculator",
    title: "Timelapse Calculator",
    description: "Plan a time-lapse — the shooting interval and number of shots to turn an event into a clip of the length you want — plus storage needed and the speed-up factor.",
    metaTitle: "Timelapse Calculator — Interval & Number of Shots",
    metaDescription: "Free time-lapse calculator. Find the shooting interval and number of shots for your event and clip length, plus storage and speed-up.",
    calcInputs: [
      numberField("eventMinutes", "Event Duration (Real Time)", { unit: "minutes", default: 120, max: 100000, step: 1 }),
      numberField("clipSeconds", "Desired Clip Length", { unit: "seconds", default: 20, max: 3600, step: 1 }),
      dropdown("fps", "Playback Frame Rate", [["24 fps", 24], ["25 fps", 25], ["30 fps", 30], ["60 fps", 60]], 30),
      numberField("mbPerShot", "File Size per Shot", { unit: "MB", default: 30, max: 500, step: 1, required: false }),
    ],
    calcResult: { label: "Interval", format: "number" },
    calcResults: [
      { key: "intervalSeconds", label: "Shooting Interval (Seconds)", format: "number", highlight: true },
      { key: "totalShots", label: "Number of Shots", format: "number" },
      { key: "storageGb", label: "Card Space Needed (GB)", format: "number" },
      { key: "speedUp", label: "Speed-Up Factor (×)", format: "number" },
    ],
    instructions: "Enter how long the event lasts, how long you want the final clip and its frame rate. Add the size of each photo (RAW files are larger) to check your memory card.",
    examples: "Example: a 2-hour sunset turned into a 20-second clip at 30 fps needs 600 shots taken every 12 seconds — about 18 GB of RAW files.",
    assumptions: "Shots = clip seconds × frame rate; interval = event time ÷ shots. Typical intervals: clouds 2–5 s, sunsets 3–10 s, stars 15–30 s, construction minutes to hours. The exposure must be shorter than the interval.",
    faq: [
      { question: "What interval should I use for a time-lapse?", answer: "Fast clouds and traffic 1–3 s, sunsets 3–10 s, stars 15–30 s, plants and building projects several minutes." },
      { question: "How many photos do I need for a 10-second time-lapse?", answer: "300 photos at 30 fps, or 240 at 24 fps." },
    ],
  },
  {
    slug: "megapixel-print-size-calculator",
    title: "Megapixel Print Size Calculator",
    description: "Find how big you can print a photo or poster from its megapixels and aspect ratio — at 300 DPI for close viewing and 150 DPI for posters — with the pixel dimensions.",
    metaTitle: "Megapixel Print Size Calculator — Print & Poster",
    metaDescription: "Free megapixel print size calculator. Find the largest photo or poster size from megapixels at 300 or 150 DPI, with pixel dimensions.",
    calcInputs: [
      numberField("megapixels", "Image Megapixels", { unit: "MP", default: 24, max: 500, step: 0.1 }),
      dropdown("aspect", "Aspect Ratio", [["3:2 (most cameras)", 0], ["4:3 (phones, MFT)", 1], ["16:9", 2], ["1:1", 3]], 0),
      numberField("dpi", "Print Resolution", { unit: "DPI", default: 300, min: 72, max: 600, step: 10 }),
    ],
    calcResult: { label: "Print Width", format: "number" },
    calcResults: [
      { key: "printWidthIn", label: "Max Print Width at Chosen DPI (in)", format: "number", highlight: true },
      { key: "printHeightIn", label: "Max Print Height (in)", format: "number" },
      { key: "posterWidthAt150Dpi", label: "Poster Width at 150 DPI (in)", format: "number" },
      { key: "posterHeightAt150Dpi", label: "Poster Height at 150 DPI (in)", format: "number" },
      { key: "widthPx", label: "Image Width (px)", format: "number" },
      { key: "heightPx", label: "Image Height (px)", format: "number" },
    ],
    instructions: "Enter the image's megapixels and aspect ratio and the print resolution — 300 DPI for prints viewed up close, 150–200 DPI for posters and wall art viewed from a distance.",
    examples: "Example: a 24 MP 3:2 photo prints at up to 20 × 13.33 in at 300 DPI, or as a poster about 40 × 26.67 in at 150 DPI.",
    assumptions: "Pixel dimensions come from megapixels and aspect ratio; print size = pixels ÷ DPI. Cropping reduces the size. Large prints viewed from several feet can go below 150 DPI and still look sharp.",
    faq: [
      { question: "How big can I print a 12 megapixel photo?", answer: "About 14 × 9.5 inches at 300 DPI, or about 28 × 19 inches as a poster at 150 DPI." },
      { question: "What DPI do I need for a poster?", answer: "150–200 DPI is usually enough, since posters are viewed from farther away than small prints." },
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
