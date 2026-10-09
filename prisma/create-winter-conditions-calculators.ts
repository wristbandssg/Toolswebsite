// One-time (but safe to re-run) batch setup script: creates the 9 tools of
// the winter sports sub-batch B (Weather, Snow, Safety & Trip). See
// src/lib/calc-engine-winter-gear.ts for the full list
// of 2 sub-batches (22 tools under Sports Calculators > Winter Sports
// Calculators), and src/lib/calc-engine-winter-conditions.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-winter-conditions-calculators.ts
// or
//   npm run db:create-winter-conditions-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Winter Sports Calculators", slug: "winter-sports-calculators" };

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

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

const DISCLAIMER =
  "Estimates for planning and education only. Gear sizes vary by brand, so try equipment on and have bindings set and tested by a certified technician. Snow, ice and cold-weather conditions change quickly: follow official forecasts, local authorities and avalanche centres, and never rely on a calculator alone for safety decisions.";

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

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 1000000, step: opts.step ?? 1 };
}
const cur = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", ...(highlight ? { highlight: true } : {}) });
const WX_UNITS: [string, number][] = [["°F and mph", 1], ["°C and km/h", 2]];
const BODY_UNITS: [string, number][] = [["Kilograms", 1], ["Pounds", 2]];

const TOOLS: ToolDef[] = [
  {
    slug: "slope-angle-calculator",
    title: "Slope Angle Calculator",
    description: "Calculate a ski slope's angle in degrees and its percent grade from vertical drop and distance — with the trail difficulty and avalanche-angle check.",
    metaTitle: "Slope Angle Calculator — Ski Slope Degrees & Grade",
    metaDescription: "Free slope angle calculator. Convert vertical drop and distance or % grade to degrees, with ski run rating and avalanche angle check.",
    calcInputs: [dropdown("mode", "I Know…", [["Vertical drop & horizontal distance (map)", 1], ["Vertical drop & slope length", 2], ["Percent grade", 3]], 1), numberField("rise", "Vertical Drop", { default: 100, max: 100000 }), numberField("run", "Horizontal Distance", { default: 300, max: 1000000 }), numberField("slopeLength", "Slope Length (Along the Surface)", { default: 320, max: 1000000 }), percentField("gradePercent", "Percent Grade", { default: 30, max: 1000 })],
    calcResult: { label: "Slope Angle", format: "number" },
    calcResults: [num("slopeDegrees", "Slope Angle (°)", true), pct("gradePercent", "Grade"), num("pisteRating", "Trail Rating (1 Green, 2 Blue, 3 Black)"), num("avalancheAngle", "In 30–45° Avalanche Range (1 Yes, 0 No)")],
    instructions: "Choose what you know. Use the same unit for drop and distance — e.g. contour lines and map distance, or a GPS track's vertical and length.",
    examples: "Example: a 100 m drop over 300 m horizontal is 18.4° — a 33% grade, typical of a North American blue run.",
    assumptions: "Angle = atan(rise ÷ run), or asin(rise ÷ slope length). Ratings follow North American guidance: green under 25% grade, blue 25–40%, black 40%+ (Europe rates differently). Most slab avalanches release on 30–45° slopes — check the avalanche forecast and carry rescue gear. " + DISCLAIMER,
    faq: [
      { question: "How steep is a black diamond run?", answer: "Usually 40% grade (about 22°) or steeper; double blacks often exceed 35°." },
      { question: "Is percent grade the same as degrees?", answer: "No — 100% grade is 45°. Degrees = atan(grade ÷ 100)." },
    ],
  },
  {
    slug: "calories-burned-skiing-calculator",
    title: "Calories Burned Skiing Calculator",
    description: "Estimate calories burned downhill skiing, snowboarding or cross-country skiing — counting active time and time on lifts.",
    metaTitle: "Calories Burned Skiing Calculator — Ski & Snowboard",
    metaDescription: "Free calories burned skiing calculator. Estimate calories for downhill, snowboarding and cross-country skiing by weight and time.",
    calcInputs: [dropdown("units", "Units", BODY_UNITS, 1), numberField("weight", "Body Weight", { default: 70, max: 500, step: 0.5 }), dropdown("activity", "Activity", [["Downhill ski / snowboard — light", 1], ["Downhill ski / snowboard — moderate", 2], ["Downhill ski / snowboard — vigorous / racing", 3], ["Cross-country — slow, light", 4], ["Cross-country — moderate", 5], ["Cross-country — brisk", 6], ["Cross-country — racing", 7]], 2), numberField("hours", "Time on the Mountain / Trail (hours)", { default: 4, max: 24, step: 0.25 }), percentField("activePercent", "Share of Time Actually Skiing", { default: 60 })],
    calcResult: { label: "Calories Burned", format: "number" },
    calcResults: [num("totalCalories", "Total Calories Burned", true), num("activeCalories", "Calories While Skiing"), num("caloriesPerHour", "Average per Hour"), num("metUsed", "MET Value Used")],
    instructions: "Enter your weight, activity, total time and roughly what share of it you spend actually moving (vs lifts, queues and breaks — about 50–70% for resort days, near 100% for cross-country).",
    examples: "Example: a 70 kg skier at moderate effort for a 4-hour day, skiing 60% of the time, burns about 1,060 calories — 890 of them on the slopes.",
    assumptions: "Calories = MET × kg × hours. METs from the Compendium of Physical Activities: downhill 4.3 / 5.3 / 8.0, cross-country 6.8 / 9.0 / 12.5 / 15.0. Lift and rest time is counted at 1.5 MET. Individual burn varies with fitness, terrain and cold. " + DISCLAIMER,
    faq: [
      { question: "Does skiing burn more than snowboarding?", answer: "They're similar at the same effort — the Compendium lists them together." },
      { question: "Why does cross-country burn so much?", answer: "It works the arms and legs continuously with no lift rides — among the highest-calorie endurance activities." },
    ],
  },
  {
    slug: "calories-burned-shoveling-snow-calculator",
    title: "Calories Burned Shoveling Snow Calculator",
    description: "Estimate calories burned shovelling snow or using a snow blower — and how much snow you're actually moving.",
    metaTitle: "Calories Burned Shoveling Snow Calculator",
    metaDescription: "Free snow shoveling calorie calculator. Estimate calories burned and the weight of snow moved from area, depth and snow type.",
    calcInputs: [dropdown("units", "Units", [["Metric (kg, m², cm)", 1], ["Imperial (lb, ft², in)", 2]], 1), numberField("weight", "Body Weight", { default: 80, max: 500, step: 0.5 }), numberField("minutes", "Time (minutes)", { default: 30, max: 600 }), dropdown("effort", "Method", [["Snow blower (walking)", 1], ["Shovelling — moderate", 2], ["Shovelling — vigorous / heavy wet snow", 3]], 2), numberField("area", "Area Cleared", { default: 56, max: 100000 }), numberField("depth", "Snow Depth", { default: 15, max: 500, step: 0.5 }), dropdown("snowType", "Snow Type", [["Light, fluffy (7 lb/ft³)", 1], ["Average (15 lb/ft³)", 2], ["Wet, heavy (20 lb/ft³)", 3]], 2)],
    calcResult: { label: "Calories Burned", format: "number" },
    calcResults: [num("caloriesBurned", "Calories Burned", true), num("snowWeightLb", "Snow Moved (lb)"), num("snowWeightKg", "Snow Moved (kg)"), num("shovelfuls", "Shovelfuls at 15 lb"), num("metUsed", "MET Value Used")],
    instructions: "Enter your weight, how long you worked and how, plus the area, depth and type of snow to see how much it weighs.",
    examples: "Example: an 80 kg person shovelling moderately for 30 minutes burns about 212 calories. Clearing 56 m² (about 600 ft²) of 15 cm average snow means moving roughly 2,000 kg (4,450 lb) — about 300 shovelfuls.",
    assumptions: "Calories = MET × kg × hours (Compendium: snow blower 2.5, shovelling moderate 5.3, vigorous 7.5). Snow weight = area × depth × density. Shovelling is strenuous for the heart — take breaks, push rather than lift, and avoid it if you have heart disease without your doctor's approval. " + DISCLAIMER,
    faq: [
      { question: "Is shovelling snow good exercise?", answer: "It's real exertion — comparable to brisk hiking — but the heavy lifting in cold air also raises heart attack risk for some people." },
      { question: "How heavy is a shovelful of snow?", answer: "Anywhere from about 5 lb of powder to 20+ lb of wet snow — keep loads small." },
    ],
  },
  {
    slug: "wind-chill-calculator",
    title: "Wind Chill Calculator",
    description: "Calculate the wind chill temperature from air temperature and wind speed with the official NWS / Environment Canada formula — plus frostbite risk.",
    metaTitle: "Wind Chill Calculator — Feels-Like Temperature",
    metaDescription: "Free wind chill calculator using the NWS formula. Get the feels-like temperature in °F and °C and frostbite risk from temperature and wind.",
    calcInputs: [dropdown("units", "Units", WX_UNITS, 1), numberField("temperature", "Air Temperature", { default: 0, min: -80, max: 60 }), numberField("windSpeed", "Wind Speed", { default: 15, max: 200 })],
    calcResult: { label: "Wind Chill", format: "number" },
    calcResults: [num("windChill", "Wind Chill (Your Units)", true), num("windChillF", "Wind Chill (°F)"), num("windChillC", "Wind Chill (°C)"), num("frostbiteRisk", "Frostbite Risk (1 Low … 5 Extreme)"), num("formulaValid", "Within Formula Range (1 Yes, 0 No)")],
    instructions: "Choose units, then enter the air temperature and the wind speed (at about 10 m, as weather reports give it).",
    examples: "Example: 0 °F with a 15 mph wind feels like about −19 °F (−29 °C) — frostbite is possible within 10–30 minutes.",
    assumptions: "NWS / Environment Canada (2001) wind chill index. Valid for air at or below 50 °F (10 °C) and wind of at least 3 mph (4.8 km/h). Risk bands (Environment Canada, wind chill °C): above −28 low; −28 to −39 moderate (10–30 min); −40 to −47 high (5–10 min); −48 to −54 very high (2–5 min); −55 and below extreme (under 2 min). " + DISCLAIMER,
    faq: [
      { question: "Does wind chill affect cars or pipes?", answer: "No — wind chill describes heat loss from skin. Objects can't cool below the actual air temperature." },
      { question: "Why is wind chill lower on the slopes?", answer: "Your own speed adds to the wind — skiing at 25 mph into a 10 mph wind feels like a 35 mph wind on your face." },
    ],
  },
  {
    slug: "frostbite-time-calculator",
    title: "Frostbite Time Calculator",
    description: "Estimate how many minutes it takes for exposed skin to get frostbite at a given temperature and wind speed.",
    metaTitle: "Frostbite Time Calculator — Minutes to Frostbite",
    metaDescription: "Free frostbite time calculator. Estimate minutes until exposed skin gets frostbite from air temperature and wind speed.",
    calcInputs: [dropdown("units", "Units", WX_UNITS, 1), numberField("temperature", "Air Temperature", { default: -20, min: -80, max: 60 }), numberField("windSpeed", "Wind Speed", { default: 15, max: 200 })],
    calcResult: { label: "Minutes to Frostbite", format: "number" },
    calcResults: [num("minutesToFrostbite", "Minutes to Frostbite (0 = Not Expected Within 60 min)", true), num("riskLevel", "Risk (1 Low, 2 Moderate, 3 High, 4 Very High, 5 Extreme)"), num("windChillF", "Wind Chill (°F)"), num("windChillC", "Wind Chill (°C)")],
    instructions: "Enter the air temperature and wind speed. Add your own speed (skiing, snowmobiling) to the wind for a face-exposure estimate.",
    examples: "Example: at −20 °F with a 15 mph wind (wind chill about −45 °F), exposed skin can freeze in about 8 minutes.",
    assumptions: "Tikuisis & Osczevski model used by Environment Canada: minutes = (−24.5 × (0.667 × wind km/h + 4.8) + 2111) × (−4.8 − T °C)^−1.668, for the most susceptible 5% of people. No frostbite is expected above about −4.8 °C (23 °F). Wet skin, poor circulation and alcohol shorten the time. Cover exposed skin and get warm at the first numbness or white patches. " + DISCLAIMER,
    faq: [
      { question: "What are the first signs of frostbite?", answer: "Cold, numb, white or greyish-yellow skin that feels firm or waxy — usually on the nose, cheeks, ears, fingers and toes." },
      { question: "How do I treat frostnip?", answer: "Get out of the cold and rewarm gently with body heat or lukewarm water — don't rub it. Seek medical care if skin stays numb or blisters." },
    ],
  },
  {
    slug: "ice-thickness-calculator",
    title: "Ice Thickness Calculator",
    description: "Check whether lake ice is thick enough for walking, ice fishing, snowmobiles, cars or trucks — adjusting for white or mixed ice.",
    metaTitle: "Ice Thickness Calculator — Is the Ice Safe?",
    metaDescription: "Free ice thickness calculator. Check safe ice thickness for walking, snowmobiles, cars and trucks, adjusted for white ice.",
    calcInputs: [dropdown("unit", "Unit", [["Inches", 1], ["Centimetres", 2]], 1), numberField("thickness", "Measured Ice Thickness", { default: 5, max: 200, step: 0.1 }), dropdown("iceType", "Ice Type", [["Clear blue / black ice", 1], ["Mixed clear and white", 2], ["White / snow ice", 3]], 1), dropdown("activity", "Activity", [["Walking / ice fishing on foot", 1], ["Snowmobile or ATV", 2], ["Car or small pickup", 3], ["Medium truck", 4]], 1)],
    calcResult: { label: "Safe for Activity", format: "number" },
    calcResults: [num("safeForActivity", "Meets Guideline (1 Yes, 0 No)", true), num("requiredThickness", "Minimum Thickness Needed (Your Unit)"), num("clearIceEquivalent", "Clear-Ice Equivalent (Your Unit)"), num("maxLoadLb", "Approx. Max Load, Gold's Formula (lb)"), num("maxLoadKg", "Approx. Max Load (kg)")],
    instructions: "Drill or chisel test holes at several spots and enter the thinnest measurement, the ice type and what you plan to do.",
    examples: "Example: 5 in of clear ice meets the 4 in guideline for walking and ice fishing — but not the 7 in suggested for a snowmobile.",
    assumptions: "New clear-ice guidance (e.g. Minnesota DNR): 4 in walking, 5–7 in snowmobile/ATV, 8–12 in car, 12–15 in medium truck — this tool uses the upper figures. White ice is about half as strong (double the thickness), mixed ice about 75%. Load uses Gold's formula P = 50 h². Ice is never 100% safe — thickness varies, and currents, springs, pressure ridges and thaws weaken it. " + DISCLAIMER,
    faq: [
      { question: "Is 2 inches of ice safe?", answer: "No — stay off ice under 4 inches of new clear ice." },
      { question: "Why is white ice weaker?", answer: "It's formed from snow and slush and contains air, so it's roughly half as strong as clear ice." },
    ],
  },
  {
    slug: "snowfall-calculator",
    title: "Snowfall Calculator",
    description: "Convert liquid precipitation (rain equivalent) into expected snowfall depth using a temperature-based snow-to-liquid ratio.",
    metaTitle: "Snowfall Calculator — Rain to Snow Conversion",
    metaDescription: "Free snowfall calculator. Convert liquid precipitation to snow depth using the snow-to-liquid ratio for the temperature.",
    calcInputs: [dropdown("units", "Units", [["Inches & °F", 1], ["Millimetres → cm & °C", 2]], 1), numberField("liquid", "Liquid Precipitation (Water Equivalent)", { default: 0.5, max: 1000, step: 0.01 }), numberField("temperature", "Temperature During Snowfall", { default: 25, min: -60, max: 50 }), numberField("customRatio", "Custom Snow Ratio (0 = Use Temperature)", { default: 0, max: 100, required: false })],
    calcResult: { label: "Snow Depth", format: "number" },
    calcResults: [num("snowDepth", "Expected Snow Depth (in or cm)", true), num("ratioUsed", "Snow-to-Liquid Ratio Used (:1)"), num("mixedPrecipitationLikely", "Too Warm — Rain/Mix Likely (1 Yes)")],
    instructions: "Enter the forecast liquid precipitation (QPF) and the expected temperature. Imperial gives inches of snow; metric takes mm of water and gives cm of snow.",
    examples: "Example: 0.5 in of liquid at 25 °F (about a 15:1 ratio) produces about 7.5 in of snow.",
    assumptions: "Common forecasting ratios by temperature: 28–34 °F 10:1, 20–27 °F 15:1, 15–19 °F 20:1, 10–14 °F 30:1, 0–9 °F 40:1, −1 to −20 °F 50:1, colder 100:1. Above about 34 °F, rain or a mix is likely. Real ratios depend on temperatures aloft, wind and crystal type. " + DISCLAIMER,
    faq: [
      { question: "Is 1 inch of rain 10 inches of snow?", answer: "That's the classic 10:1 average near freezing — colder, drier snow can be 20:1 or more." },
      { question: "Why does cold snow pile up deeper?", answer: "Cold, dry flakes are light and fluffy with more air, so the same water makes more depth." },
    ],
  },
  {
    slug: "snow-water-equivalent-calculator",
    title: "Snow Water Equivalent Calculator",
    description: "Convert snow depth into snow water equivalent (SWE) using snow density — and the snow load it puts on a roof.",
    metaTitle: "Snow Water Equivalent Calculator — SWE & Snow Load",
    metaDescription: "Free snow water equivalent calculator. Convert snow depth to SWE (in, mm) by snow type, plus roof snow load in lb/ft² and kg/m².",
    calcInputs: [dropdown("unit", "Unit", [["Inches", 1], ["Centimetres", 2]], 1), numberField("snowDepth", "Snow Depth", { default: 12, max: 2000, step: 0.1 }), dropdown("snowType", "Snow Type", [["Fresh powder (7%)", 1], ["Average new snow (10%)", 2], ["Settled snow (25%)", 3], ["Wind-packed (35%)", 4], ["Spring / wet snow (45%)", 5]], 2), percentField("customDensity", "Custom Density (% of Water, 0 = Use Type)", { default: 0 })],
    calcResult: { label: "SWE", format: "number" },
    calcResults: [num("sweInches", "Snow Water Equivalent (in)", true), num("sweMm", "Snow Water Equivalent (mm)"), num("snowToLiquidRatio", "Snow-to-Liquid Ratio (:1)"), num("snowLoadLbFt2", "Snow Load (lb/ft²)"), num("snowLoadKgM2", "Snow Load (kg/m²)")],
    instructions: "Enter the snow depth and choose its type — or, if you weighed a core sample, enter its density as a percentage of water.",
    examples: "Example: 12 in of average new snow (10% density) holds 1.2 in (30 mm) of water — a roof load of about 6.2 lb/ft².",
    assumptions: "SWE = depth × density ÷ water density. 1 in of water = 5.2 lb/ft²; 1 mm = 1 kg/m². Snowpack density varies a lot with age, wind and melt — measured cores are best. Check roof design snow loads with a local building professional. " + DISCLAIMER,
    faq: [
      { question: "Why does SWE matter?", answer: "It shows how much water the snowpack holds — key for water supply, flood forecasting and roof loads." },
      { question: "How heavy is wet snow on a roof?", answer: "A foot of wet spring snow can weigh 20+ lb/ft² — several times as much as fresh powder." },
    ],
  },
  {
    slug: "ski-trip-cost-calculator",
    title: "Ski Trip Cost Calculator",
    description: "Budget a ski trip — lift tickets, lodging, rentals, lessons, travel and food — with the total, cost per person and per person per day.",
    metaTitle: "Ski Trip Cost Calculator — Ski Vacation Budget",
    metaDescription: "Free ski trip cost calculator. Budget lift tickets, lodging, rentals, food and travel, with cost per person and per day.",
    calcInputs: [
      numberField("travelers", "Number of People", { default: 4, min: 1, max: 100 }),
      numberField("skiDays", "Ski Days", { default: 3, max: 60 }),
      numberField("nights", "Nights of Lodging", { default: 3, max: 60 }),
      currencyField("liftTicketPerDay", "Lift Ticket per Person per Day", { default: 120, max: 1000 }),
      currencyField("lodgingPerNight", "Lodging per Night (Whole Group)", { default: 300, max: 20000 }),
      currencyField("rentalPerDay", "Rental per Person per Day", { default: 50, max: 500 }),
      numberField("renters", "People Renting Gear", { default: 2, max: 100 }),
      currencyField("lessons", "Lessons (Total)", { default: 0, max: 20000, required: false }),
      currencyField("travel", "Travel (Flights, Fuel, Transfers — Total)", { default: 400, max: 50000 }),
      currencyField("foodPerPersonPerDay", "Food per Person per Day", { default: 60, max: 1000 }),
      currencyField("other", "Other (Parking, Lockers, Insurance)", { default: 100, max: 20000, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [cur("totalCost", "Total Trip Cost", true), cur("costPerPerson", "Cost per Person"), cur("costPerPersonPerDay", "Cost per Person per Ski Day"), cur("liftTicketsTotal", "Lift Tickets"), cur("lodgingTotal", "Lodging"), cur("foodTotal", "Food"), cur("rentalsTotal", "Rentals")],
    instructions: "Enter the group size, ski days and nights, then each cost. Lift tickets, rentals and food are per person per day; lodging is per night for the whole group.",
    examples: "Example: 4 people, 3 ski days and 3 nights with $120 lift tickets, $300/night lodging, 2 renters at $50/day, $400 travel, $60/day food and $100 extra costs $3,860 — $965 per person, or about $322 per person per ski day.",
    assumptions: "Food is counted for the longer of ski days or nights. Buying lift tickets early, multi-day passes or season passes (Epic, Ikon) can cut ticket costs sharply. " + DISCLAIMER,
    faq: [
      { question: "How much does a ski trip cost?", answer: "In North America a weekend often runs $300–600 per person per day all-in at major resorts; driving, bringing gear and booking early lowers it." },
      { question: "Is a season pass worth it?", answer: "Often after 4–7 days at major resorts, depending on the pass and resort window prices." },
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
