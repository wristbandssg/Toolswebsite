// One-time (but safe to re-run) batch setup script: creates the 7 tools of
// the other-sports sub-batch "Wind Sports, Boating, Fishing & Tides". See
// src/lib/calc-engine-other-football.ts for the full list
// of 17 sub-batches (all under Sports Calculators > Other Sports
// Calculators), and src/lib/calc-engine-other-wind-boat.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-other-wind-boat-calculators.ts
// or
//   npm run db:create-other-wind-boat-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Other Sports Calculators", slug: "other-sports-calculators" };

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

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "percentage", unit: "%", required: true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 1000000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

const DISCLAIMER =
  "Estimates for planning, training and fun. Sizing, ratings and physics models are approximations — check official rules, manufacturer charts and qualified coaches, and treat health figures as general guidance, not medical advice.";

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

const num = (key: string, label: string, highlight = false, decimals?: number) => ({ key, label, format: "number", ...(decimals !== undefined ? { decimals } : {}), ...(highlight ? { highlight: true } : {}) });

const pct = (key: string, label: string, highlight = false) => ({ key, label, format: "percentage", ...(highlight ? { highlight: true } : {}) });
const cur = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", ...(highlight ? { highlight: true } : {}) });

const WT = (def = 175) => [numberField("weight", "Rider Weight", { default: def, min: 40, max: 400 }), dropdown("weightUnit", "Weight Unit", [["lb", 1], ["kg", 2]], 1)];
const WIND = () => [numberField("windSpeed", "Wind Speed", { default: 18, min: 5, max: 60 }), dropdown("windUnit", "Wind Unit", [["knots", 1], ["mph", 2], ["km/h", 3]], 1)];
const SAFE = " Get lessons, check the forecast and never ride beyond your ability.";

const TOOLS: ToolDef[] = [
  {
    slug: "kite-size-calculator",
    title: "Kite Size Calculator",
    description: "Find the right kitesurfing kite size for your weight and the wind — plus a twin-tip board length.",
    metaTitle: "Kite Size Calculator — Kitesurfing Kite Size",
    metaDescription: "Free kite size calculator. Get kitesurf kite size in m² from rider weight and wind speed for twin-tip, big board or foil.",
    calcInputs: [...WT(), ...WIND(), dropdown("board", "Board", [["Twin-tip", 1], ["Big / light-wind board", 2], ["Hydrofoil", 3]], 1)],
    calcResult: { label: "Kite Size", format: "number" },
    calcResults: [num("kiteSizeM2", "Kite Size (m²)", true), num("nearestStandardSize", "Nearest Common Size (m²)"), num("windKnots", "Wind (knots)"), num("twinTipLengthCm", "Twin-Tip Length (cm)")],
    instructions: "Enter your weight, the wind you'll ride in and your board type.",
    examples: "Example: a 175 lb (79 kg) rider in 18 knots on a twin-tip → about a 9.7 m² kite (a 10 m).",
    assumptions: "Kite size ≈ rider kg ÷ wind knots × 2.2 for twin-tips (× 0.85 with a big light-wind board; foils need about half that, factor 1.2). Gusty or very strong wind calls for smaller. Kite designs differ — check the maker's wind range." + SAFE + " " + DISCLAIMER,
    faq: [
      { question: "What kite size should I buy first?", answer: "For most adults a 9–12 m kite covers the most common winds." },
      { question: "What is the minimum wind for kitesurfing?", answer: "About 12 knots on a twin-tip, under 10 on a foil." },
    ],
  },
  {
    slug: "wing-size-calculator",
    title: "Wing Size Calculator",
    description: "Find the right wing-foil wing size for your weight, the wind and your skill — plus a board volume.",
    metaTitle: "Wing Size Calculator — Wing Foil Size",
    metaDescription: "Free wing foil size calculator. Get wing size in m² and board volume from rider weight, wind speed and skill.",
    calcInputs: [...WT(), ...WIND(), dropdown("skill", "Skill", [["Beginner", 1], ["Intermediate", 2], ["Advanced", 3]], 2)],
    calcResult: { label: "Wing Size", format: "number" },
    calcResults: [num("wingSizeM2", "Wing Size (m²)", true), num("nearestStandardSize", "Nearest Common Size (m²)"), num("boardVolumeLitres", "Board Volume (L)"), num("windKnots", "Wind (knots)")],
    instructions: "Enter your weight, wind speed and skill.",
    examples: "Example: a 175 lb (79 kg) intermediate in 18 knots → about a 4.4 m² wing (4.5 m) and a board of about 99 L.",
    assumptions: "Wing size ≈ rider kg ÷ wind knots (× 1.15 beginner, × 0.9 advanced). Board volume ≈ body kg + 40 L (beginner), + 20 L (intermediate) or ≈ body kg (advanced). Foil front-wing size matters as much as the wing." + SAFE + " " + DISCLAIMER,
    faq: [
      { question: "What wind do you need for wing foiling?", answer: "About 12–25 knots for most riders." },
      { question: "Can I use my wing on a SUP?", answer: "Yes — winging on a SUP is a common way to learn before foiling." },
    ],
  },
  {
    slug: "boat-speed-calculator",
    title: "Boat Speed Calculator",
    description: "Estimate boat speed — displacement hull speed from waterline length, or planing speed from weight and horsepower (Crouch's formula).",
    metaTitle: "Boat Speed Calculator — Hull Speed & Planing Speed",
    metaDescription: "Free boat speed calculator. Get displacement hull speed from waterline length or planing speed from weight and horsepower.",
    calcInputs: [dropdown("method", "Boat", [["Displacement hull (sailboat, trawler)", 1], ["Planing hull (powerboat)", 2]], 1), numberField("waterlineLength", "Waterline Length (ft)", { default: 30, min: 5, max: 400 }), numberField("boatWeight", "Loaded Boat Weight (lb)", { default: 3000, min: 100, max: 200000 }), numberField("horsepower", "Engine Horsepower", { default: 150, min: 1, max: 5000 }), dropdown("hullType", "Planing Hull Type", [["Average runabout", 1], ["High-performance", 2], ["Racing / hydroplane", 3], ["Heavy cruiser", 4]], 1)],
    calcResult: { label: "Speed", format: "number" },
    calcResults: [num("speedKnots", "Speed (knots)", true), num("speedMph", "Speed (mph)"), num("speedKmh", "Speed (km/h)")],
    instructions: "For a sailboat or trawler, enter the waterline length. For a powerboat, enter loaded weight, horsepower and hull type.",
    examples: "Example: a 30 ft waterline sailboat has a hull speed of about 7.3 knots. A 3,000 lb runabout with 150 hp reaches about 33.5 mph.",
    assumptions: "Hull speed = 1.34 × √(waterline ft) knots. Crouch's planing formula: mph = C ÷ √(lb per hp), with C ≈ 150 (runabouts), 190 (high-performance), 210 (race), 130 (heavy cruisers). Props, trim, load and sea state change real speed. " + DISCLAIMER,
    faq: [
      { question: "Can a sailboat exceed hull speed?", answer: "Only briefly, surfing down waves or with planing designs." },
      { question: "How much faster will more horsepower make my boat?", answer: "Speed rises with the square root of power — doubling hp adds about 41%." },
    ],
  },
  {
    slug: "boat-fuel-calculator",
    title: "Boat Fuel Calculator",
    description: "Estimate boat fuel burn (gallons per hour), fuel for a trip with the one-third reserve rule, cost and range.",
    metaTitle: "Boat Fuel Calculator — GPH, Trip Fuel & Range",
    metaDescription: "Free boat fuel calculator. Estimate gallons per hour, trip fuel with reserve, fuel cost and range from horsepower.",
    calcInputs: [dropdown("engine", "Engine", [["Gasoline", 1], ["Diesel", 2]], 1), numberField("horsepower", "Total Horsepower", { default: 150, min: 1, max: 5000 }), percentField("throttlePct", "Throttle / Load", { default: 60, min: 5, max: 100 }), numberField("cruiseSpeed", "Cruise Speed (mph or knots)", { default: 25, min: 1, max: 100 }), numberField("tripDistance", "Trip Distance (same unit)", { default: 40, max: 2000 }), numberField("tankGallons", "Fuel Tank (gallons)", { default: 50, min: 1, max: 5000 }), currencyField("fuelPrice", "Fuel Price per Gallon", { default: 4.5, step: 0.01 })],
    calcResult: { label: "Gallons per Hour", format: "number" },
    calcResults: [num("gallonsPerHour", "Fuel Burn (gal/h)", true), num("tripGallons", "Trip Fuel (gal)"), num("carryWithReserve", "Carry incl. Reserve (gal)"), cur("tripCost", "Trip Fuel Cost"), num("rangeOnTankMiles", "Safe Range on a Full Tank (⅔ rule)"), num("milesPerGallon", "Miles (or nm) per Gallon")],
    instructions: "Enter engine type and horsepower, your cruise throttle and speed, the trip distance, tank size and fuel price.",
    examples: "Example: a 150 hp gas outboard at 60% load burns about 9 gal/h. A 40-mile trip at 25 mph uses 14.4 gal ($64.80) — carry 21.6 gal for the reserve. Safe range on 50 gal ≈ 93 miles.",
    assumptions: "Rule of thumb: gasoline ≈ 0.10 gal/h per hp at full load, diesel ≈ 0.055; burn scales with load. Use the 'thirds' rule: ⅓ out, ⅓ back, ⅓ reserve. Hull, trim and sea state make a big difference — check your engine's fuel-flow data. " + DISCLAIMER,
    faq: [
      { question: "How much fuel does a boat use per hour?", answer: "Roughly 10% of horsepower in gallons at full throttle for gas engines — much less at cruise." },
      { question: "What is the rule of thirds?", answer: "Plan to use one third of your fuel going out, one third returning and keep one third in reserve." },
    ],
  },
  {
    slug: "jet-ski-value-calculator",
    title: "Jet Ski Value Calculator",
    description: "Estimate a used jet ski (PWC) value from its original price, age, engine hours and condition.",
    metaTitle: "Jet Ski Value Calculator — Used PWC Value",
    metaDescription: "Free jet ski value calculator. Estimate used jet ski private-sale and trade-in value by age, hours and condition.",
    calcInputs: [currencyField("originalPrice", "Original Price (new)", { default: 15000 }), numberField("ageYears", "Age (years)", { default: 4, max: 40 }), numberField("engineHours", "Engine Hours", { default: 200, max: 5000 }), dropdown("condition", "Condition", [["Excellent", 1], ["Good", 2], ["Fair", 3], ["Poor / needs work", 4]], 2), currencyField("trailerValue", "Trailer Included (value)", { default: 0, required: false })],
    calcResult: { label: "Private Sale Value", format: "currency" },
    calcResults: [cur("privateSaleValue", "Private Sale Value", true), cur("tradeInValue", "Dealer Trade-In Value"), pct("percentOfOriginal", "Value as % of New")],
    instructions: "Enter what the PWC cost new, its age, the engine hours and condition, plus any trailer.",
    examples: "Example: a $15,000 jet ski, 4 years old with 200 hours in good condition → about $8,970 private sale, $7,170 trade-in.",
    assumptions: "Depreciation ≈ 18% in year one, then about 10% a year; each 100 hours above or below about 50 hours a year moves value about 4%. Condition × 1.05 / 1.0 / 0.85 / 0.65. Supercharged models and popular brands hold value differently — compare local listings and NADA guides. " + DISCLAIMER,
    faq: [
      { question: "How many hours is a lot for a jet ski?", answer: "Around 300+ hours is considered high for many 4-stroke PWCs, though well-maintained engines go much longer." },
      { question: "When is the best time to sell?", answer: "Spring, just before the season." },
    ],
  },
  {
    slug: "fishing-line-calculator",
    title: "Fishing Line Calculator",
    description: "Work out how much of a different fishing line fits your reel — mono, braid or fluorocarbon — and how much backing you need.",
    metaTitle: "Fishing Line Calculator — Reel Line Capacity",
    metaDescription: "Free fishing line capacity calculator. Convert reel capacity to braid, mono or fluoro at any pound test and find backing.",
    calcInputs: [numberField("ratedYards", "Reel Rated Capacity (yards)", { default: 200, min: 10, max: 5000 }), numberField("ratedLb", "…of Monofilament Rated (lb test)", { default: 10, min: 1, max: 130 }), dropdown("newType", "New Line Type", [["Monofilament", 1], ["Braid", 2], ["Fluorocarbon", 3]], 2), numberField("newLb", "New Line (lb test)", { default: 20, min: 1, max: 130 }), numberField("topShotYards", "Top Shot Length (yd, 0 = full spool)", { default: 0, max: 1000, required: false })],
    calcResult: { label: "New Capacity", format: "number" },
    calcResults: [num("newCapacityYards", "Capacity of New Line (yd)", true), num("newCapacityMetres", "Capacity (m)"), num("newLineDiameterMm", "Estimated New Line Diameter (mm)"), num("backingYardsNeeded", "Mono Backing Needed under the Top Shot (yd)")],
    instructions: "Read the capacity on the reel (e.g. '10 lb / 200 yd'), choose the new line and, for braid over backing, how much braid you want on top.",
    examples: "Example: a reel rated 200 yd of 10 lb mono holds about 536 yd of 20 lb braid.",
    assumptions: "Capacity scales with diameter²: new yards = rated yards × (rated diameter ÷ new diameter)². Diameters are typical (10 lb mono ≈ 0.28 mm; braid ≈ 45% of mono of the same test; fluoro ≈ 95%). Use the actual diameters on the packaging for best accuracy, and fill to about ⅛\" below the lip. " + DISCLAIMER,
    faq: [
      { question: "Why use mono backing under braid?", answer: "It stops braid slipping on the spool and saves expensive braid." },
      { question: "How much line do I need?", answer: "100–150 yd for most freshwater casting; more for offshore." },
    ],
  },
  {
    slug: "tide-calculator",
    title: "Tide Calculator",
    description: "Estimate the tide height at any time between low and high water (rising or falling) — with the rule of twelfths and the rate of rise.",
    metaTitle: "Tide Calculator — Tide Height & Rule of Twelfths",
    metaDescription: "Free tide calculator. Estimate tide height at a given time between low and high tide using the cosine curve and rule of twelfths.",
    calcInputs: [numberField("lowTime", "First Tide (Low or High) — Time, 24 h (6.5 = 6:30)", { default: 6, max: 24, step: 0.05 }), numberField("lowHeight", "First Tide — Height", { default: 0.5, min: -5, max: 20, step: 0.1 }), numberField("highTime", "Next Tide — Time (24 h)", { default: 12.25, max: 24, step: 0.05 }), numberField("highHeight", "Next Tide — Height", { default: 4.5, min: -5, max: 20, step: 0.1 }), numberField("queryTime", "Time to Check (24 h)", { default: 9, max: 24, step: 0.05 })],
    calcResult: { label: "Tide Height", format: "number" },
    calcResults: [num("tideHeight", "Tide Height at That Time", true), num("ruleOfTwelfthsHeight", "Rule of Twelfths Estimate"), num("tidalRange", "Tidal Range"), num("riseRatePerHour", "Change per Hour at That Time (+ rising / − falling)")],
    instructions: "Copy two consecutive tides (low then high for a rising tide, or high then low for a falling tide) from your local tide table. Use decimal hours (9.5 = 9:30).",
    examples: "Example: low 0.5 m at 06:00, high 4.5 m at 12:15. At 09:00 the tide is about 2.37 m, rising about 1 m per hour.",
    assumptions: "Height follows a cosine curve between low and high water; the rule of twelfths (1, 2, 3, 3, 2, 1 twelfths of the range per sixth of the time) is shown for comparison. Local geography, weather and surge cause differences — always use official tide predictions for navigation. " + DISCLAIMER,
    faq: [
      { question: "What is the rule of twelfths?", answer: "The tide rises 1/12 of its range in the first hour, 2/12 in the second, 3/12 in the third and fourth, then 2/12 and 1/12." },
      { question: "When does the tide move fastest?", answer: "Mid-way between low and high water." },
    ],
  },
];
async function ensureCategory(cat: { name: string; slug: string }) {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: cat.slug } });
  if (existing) return existing;
  const parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_SLUG } });
  if (!parent) throw new Error(`The "${PARENT_SLUG}" category doesn't exist yet — create it in /admin first.`);
  console.log(`Creating sub-category "${cat.name}" under "${parent.name}".`);
  return prisma.toolCategory.create({
    data: { name: cat.name, slug: cat.slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategory(CATEGORY);

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
