// One-time (but safe to re-run) batch setup script: creates the 11 tools of
// the hiking sub-batch C (Trail Planning & Gear). See
// src/lib/calc-engine-hiking-steps.ts for the full list
// of 3 sub-batches (29 tools under Sports Calculators > Hiking
// Calculators), and src/lib/calc-engine-hiking-trail.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-hiking-trail-calculators.ts
// or
//   npm run db:create-hiking-trail-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Hiking Calculators", slug: "hiking-calculators" };

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
  "Estimates for planning only. Calorie, fitness and walk-test figures are general guidance, not medical advice — check with a doctor before starting a new exercise programme or a clinical test. Trail times, water and food needs vary with weather, terrain and fitness, so always plan a margin.";

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

const UNITS = () => dropdown("unit", "Units", [["km & metres", 1], ["miles & feet", 2]], 1);
const FITNESS_OPTS: [string, number][] = [["Fit / fast", 1], ["Average", 2], ["Slow / heavy pack / beginners", 3]];
const MONTHS: [string, number][] = [["January", 1], ["February", 2], ["March", 3], ["April", 4], ["May", 5], ["June", 6], ["July", 7], ["August", 8], ["September", 9], ["October", 10], ["November", 11], ["December", 12]];
const THRU = (miles: number, perDay: number, month: number, day: number, cost: number) => [
  numberField("miles", "Miles to Hike (full trail by default)", { default: miles, max: 3000, step: 0.1 }),
  numberField("milesPerDay", "Miles per Hiking Day", { default: perDay, min: 1, max: 50, step: 0.5 }),
  numberField("zeroDaysPerWeek", "Zero (Rest) Days per Week", { default: 1, max: 6, step: 0.5 }),
  dropdown("startMonth", "Start Month", MONTHS, month),
  numberField("startDay", "Start Day of Month", { default: day, min: 1, max: 31 }),
  currencyField("costPerDay", "Spending per Day (town, resupply, gear)", { default: cost }),
];

const TOOLS: ToolDef[] = [
  {
    slug: "hiking-time-calculator",
    title: "Hiking Time Calculator",
    description: "Estimate how long a hike will take with Naismith's rule — distance, ascent and descent — adjusted for fitness and breaks.",
    metaTitle: "Hiking Time Calculator — Naismith's Rule",
    metaDescription: "Free hiking time calculator. Estimate hike duration from distance and elevation with Naismith's rule, Langmuir descent and breaks.",
    calcInputs: [UNITS(), numberField("distance", "Distance", { default: 10, max: 200, step: 0.1 }), numberField("ascent", "Total Ascent", { default: 600, max: 30000 }), numberField("descent", "Total Descent", { default: 0, max: 30000, required: false }), dropdown("descentType", "Descent Type", [["Gentle (5–12°) — faster", 1], ["Steep (over 12°) — slower", 2]], 1), dropdown("fitness", "Group Pace", FITNESS_OPTS, 2), percentField("breakPct", "Breaks (% of moving time)", { default: 10, max: 100 })],
    calcResult: { label: "Total Time", format: "number" },
    calcResults: [num("totalHours", "Total Time (hours)", true), num("totalMinutes", "Total Time (minutes)"), num("movingMinutes", "Moving Time (min)"), num("breakMinutes", "Breaks (min)"), num("averageSpeedKmh", "Average Speed incl. Breaks (km/h)")],
    instructions: "Enter the route distance and total ascent (and descent if you want it counted) from a map or app, your group's pace and how much time you'll spend on breaks.",
    examples: "Example: 10 km with 600 m of ascent → 2 h for the distance + 1 h for the climb = 3 h moving, plus 10% breaks = 3 h 18 min.",
    assumptions: "Naismith's rule: 1 hour per 5 km (3 miles) plus 1 hour per 600 m (2,000 ft) of ascent. Langmuir corrections: −10 min per 300 m of gentle descent, +10 min per 300 m of steep descent. Fit groups × 0.8, slow groups × 1.25. Rough ground, snow and navigation take longer — always allow spare daylight. " + DISCLAIMER,
    faq: [
      { question: "How long does it take to hike 10 miles?", answer: "About 3½–5 hours for most hikers on a trail with moderate climbing, plus breaks." },
      { question: "Is Naismith's rule accurate?", answer: "It suits fit hikers with light packs; most groups take 20–50% longer, which is why there's a pace setting." },
    ],
  },
  {
    slug: "hiking-distance-calculator",
    title: "Hiking Distance Calculator",
    description: "Find out how far you can hike in the time you have — per day and for a multi-day trip — allowing for climbing, fitness and breaks.",
    metaTitle: "Hiking Distance Calculator — How Far Can I Hike?",
    metaDescription: "Free hiking distance calculator. See how many miles or km you can hike per day from your hours, pace and elevation gain.",
    calcInputs: [UNITS(), numberField("hoursPerDay", "Hours on the Trail per Day", { default: 7, min: 0.5, max: 18, step: 0.5 }), percentField("breakPct", "Time Spent on Breaks", { default: 15, max: 90 }), numberField("flatSpeed", "Flat-Ground Speed (km/h or mph)", { default: 5, min: 0.5, max: 10, step: 0.1 }), numberField("gainPerDistance", "Average Climb (m per km, or ft per mile)", { default: 50, max: 1000 }), dropdown("fitness", "Pace", FITNESS_OPTS, 2), numberField("days", "Days", { default: 3, min: 1, max: 200 })],
    calcResult: { label: "Distance per Day", format: "number" },
    calcResults: [num("distancePerDayKm", "Distance per Day (km)", true), num("distancePerDayMiles", "Distance per Day (miles)"), num("tripDistanceKm", "Trip Distance (km)"), num("tripDistanceMiles", "Trip Distance (miles)"), num("elevationGainPerDay", "Climbing per Day (m or ft)")],
    instructions: "Enter how many hours you'll be out each day, how much of that is breaks, your flat-ground speed and how hilly the route is on average.",
    examples: "Example: 7 hours a day with 15% breaks at 5 km/h on terrain climbing 50 m per km → about 21 km (13 miles) a day, 63 km over 3 days, with about 1,050 m of climbing daily.",
    assumptions: "Inverse Naismith: each km takes 1 ÷ speed hours plus (climb per km ÷ 600 m) hours, scaled by pace (fit × 0.8, slow × 1.25). Typical flat speeds: 4–5 km/h (2.5–3 mph) with a day pack, 3–4 km/h with a full backpack. " + DISCLAIMER,
    faq: [
      { question: "How far can a beginner hike in a day?", answer: "About 8–15 km (5–10 miles) on a trail with moderate hills." },
      { question: "How many miles a day do backpackers average?", answer: "10–15 miles is typical; thru-hikers build up to 20–25+." },
    ],
  },
  {
    slug: "hiking-grade-calculator",
    title: "Hiking Grade Calculator",
    description: "Calculate a trail's grade (steepness %) and angle from elevation gain and distance — and how hard it is.",
    metaTitle: "Hiking Grade Calculator — Trail Steepness",
    metaDescription: "Free hiking grade calculator. Get trail grade %, angle, feet per mile and difficulty from distance and elevation gain.",
    calcInputs: [UNITS(), numberField("distance", "Distance (map / horizontal)", { default: 3, min: 0.01, max: 200, step: 0.01 }), numberField("elevationGain", "Elevation Gain", { default: 1500, max: 30000 })],
    calcResult: { label: "Grade", format: "percentage" },
    calcResults: [pct("gradePct", "Average Grade", true), num("angleDegrees", "Angle (°)"), num("feetPerMile", "Feet per Mile"), num("metresPerKm", "Metres per km"), num("difficulty", "Difficulty (1 Easy … 5 Extreme)")],
    instructions: "Enter the distance of the climbing section and the height gained over it. Use one-way numbers for an out-and-back.",
    examples: "Example: 1,500 ft of gain over 3 miles = 500 ft per mile, a 9.5% average grade (5.4°) — moderate.",
    assumptions: "Grade = rise ÷ run × 100; angle = arctan(rise ÷ run). Bands: < 5% easy, 5–10% moderate, 10–15% strenuous, 15–20% very strenuous, 20%+ extreme. Averages hide steep pitches — check the elevation profile. " + DISCLAIMER,
    faq: [
      { question: "Is 1,000 feet per mile steep?", answer: "Yes — about 19% average grade, which most hikers find very strenuous." },
      { question: "Is a 45° slope 45% grade?", answer: "No — a 45° slope is a 100% grade (rise equals run)." },
    ],
  },
  {
    slug: "appalachian-trail-time-calculator",
    title: "Appalachian Trail Time Calculator",
    description: "Estimate how long an Appalachian Trail thru-hike or section hike takes, your Katahdin finish date and the budget.",
    metaTitle: "Appalachian Trail Time Calculator — AT Thru-Hike",
    metaDescription: "Free Appalachian Trail calculator. Estimate AT thru-hike days, finish date vs the Katahdin closing date, and total cost.",
    calcInputs: THRU(2197.4, 15, 3, 15, 40),
    calcResult: { label: "Total Days", format: "number" },
    calcResults: [num("totalDays", "Total Days on Trail", true), num("months", "Months"), num("finishMonth", "Finish Month"), num("finishDay", "Finish Day"), num("daysBeforeKatahdinClosing", "Days to Spare before Oct 15 (− = too late)"), cur("estimatedCost", "Estimated Cost")],
    instructions: "Enter your planned miles per hiking day, rest days per week, start date (northbound from Springer Mountain) and daily spending. For a section hike, change the miles.",
    examples: "Example: 2,197.4 miles at 15 miles a day with one zero a week, starting March 15 → about 172 days, finishing around September 3 — 42 days before Katahdin's usual October 15 closing. At $40 a day that's about $6,880.",
    assumptions: "Trail length 2,197.4 miles (ATC). Days = hiking days × 7 ÷ (7 − zero days per week). Baxter State Park usually closes Katahdin to thru-hikers around October 15. Most thru-hikers take 5–7 months and spend roughly $1,000–1,500 a month. " + DISCLAIMER,
    faq: [
      { question: "How long does it take to hike the Appalachian Trail?", answer: "Most thru-hikers take 5 to 7 months." },
      { question: "When should I start a northbound AT hike?", answer: "Most start between early March and mid-April; register with the ATC to spread out the crowds." },
    ],
  },
  {
    slug: "pct-time-calculator",
    title: "PCT Time Calculator",
    description: "Plan a Pacific Crest Trail thru-hike — total days, when you'll reach the Sierra at Kennedy Meadows, the finish date and the cost.",
    metaTitle: "PCT Time Calculator — Pacific Crest Trail Thru-Hike",
    metaDescription: "Free PCT calculator. Estimate Pacific Crest Trail thru-hike days, Kennedy Meadows arrival, finish date vs October snow, and cost.",
    calcInputs: THRU(2650, 18, 4, 20, 45),
    calcResult: { label: "Total Days", format: "number" },
    calcResults: [num("totalDays", "Total Days on Trail", true), num("months", "Months"), num("kennedyMeadowsMonth", "Reach Kennedy Meadows (Mile 702) — Month"), num("kennedyMeadowsDay", "Reach Kennedy Meadows — Day"), num("finishMonth", "Finish Month"), num("finishDay", "Finish Day"), num("daysBeforeEarlyOctober", "Days to Spare before Oct 1 (− = snow risk)"), cur("estimatedCost", "Estimated Cost")],
    instructions: "Enter your planned miles per hiking day, rest days per week, start date at the Mexican border (Campo) and daily spending.",
    examples: "Example: 2,650 miles at 18 a day with one zero a week, starting April 20 → about 173 days. You'd reach Kennedy Meadows around June 5 but finish around October 10 — 9 days into early-October snow season, so start earlier or hike more miles.",
    assumptions: "Trail length about 2,650 miles; Kennedy Meadows South (gateway to the Sierra) at mile 702 — most hikers aim to arrive around early to mid-June depending on snowpack. Northern Washington often gets snow from early October. Same days formula as the AT tool. Permits: PCTA long-distance permit. " + DISCLAIMER,
    faq: [
      { question: "How long does the PCT take?", answer: "Usually 4 to 6 months — most thru-hikers average 18–25 miles a day once fit." },
      { question: "When should I start the PCT?", answer: "Most northbound hikers start between mid-March and early May." },
    ],
  },
  {
    slug: "backpack-weight-calculator",
    title: "Backpack Weight Calculator",
    description: "Find the maximum backpack weight you should carry for your body weight — day hike, backpacking or kids — and check your pack.",
    metaTitle: "Backpack Weight Calculator — Max Pack Weight",
    metaDescription: "Free backpack weight calculator. See the recommended maximum pack weight for your body weight and what % your pack is.",
    calcInputs: [numberField("bodyWeight", "Body Weight", { default: 180, max: 600 }), dropdown("tripType", "Trip", [["Day hike (10%)", 1], ["Backpacking (20%)", 2], ["Maximum for fit adults (25%)", 3], ["Children (15%)", 4]], 2), numberField("packWeight", "Your Pack Weight (same unit, optional)", { default: 40, max: 200, required: false })],
    calcResult: { label: "Max Pack Weight", format: "number" },
    calcResults: [num("maxPackWeight", "Recommended Max Pack Weight", true), pct("maxPct", "Limit Used"), pct("yourPackPct", "Your Pack as % of Body Weight"), num("overBy", "Over (+) / Under (−) the Limit")],
    instructions: "Enter your body weight, the type of trip and (optionally) your loaded pack weight, all in the same unit.",
    examples: "Example: a 180 lb hiker going backpacking should keep the pack to about 36 lb. A 40 lb pack is 22% of body weight — 4 lb over.",
    assumptions: "Common guidance: day pack up to about 10% of body weight, loaded backpacking pack up to about 20%, and no more than 25% for fit adults; children 10–15%. Very lean or very heavy people should use judgment. " + DISCLAIMER,
    faq: [
      { question: "How heavy should a backpacking pack be?", answer: "No more than about 20% of your body weight with food and water." },
      { question: "How do I cut pack weight?", answer: "Start with the \"big three\" — pack, shelter and sleep system — then cut extras and carry less water where sources are reliable." },
    ],
  },
  {
    slug: "base-weight-calculator",
    title: "Base Weight Calculator",
    description: "Calculate your backpacking base weight (pack without food, water and fuel) and whether it's ultralight, lightweight or traditional.",
    metaTitle: "Base Weight Calculator — Ultralight Backpacking",
    metaDescription: "Free base weight calculator. Subtract food, water and fuel from your pack weight and see if you're ultralight.",
    calcInputs: [dropdown("unit", "Unit", [["kg", 1], ["lb", 2]], 2), numberField("totalPackWeight", "Total Pack Weight (packed, on the scale)", { default: 22, max: 150, step: 0.1 }), numberField("food", "Food", { default: 6, max: 50, step: 0.1 }), numberField("water", "Water", { default: 4.4, max: 50, step: 0.1 }), numberField("fuel", "Fuel", { default: 0.5, max: 10, step: 0.1, required: false })],
    calcResult: { label: "Base Weight", format: "number" },
    calcResults: [num("baseWeight", "Base Weight (your unit)", true), num("baseWeightOther", "Base Weight (other unit)"), num("consumables", "Consumables (food + water + fuel)"), num("category", "Class (1 Super Ultralight, 2 Ultralight, 3 Lightweight, 4 Traditional)")],
    instructions: "Weigh your packed bag, then enter the food, water and fuel in it. Don't include clothes you're wearing or items in your hands.",
    examples: "Example: a 22 lb pack carrying 6 lb of food, 4.4 lb (2 L) of water and 0.5 lb of fuel has an 11.1 lb base weight — lightweight, about 1 lb off ultralight.",
    assumptions: "Base weight = total pack weight − consumables (food, water, fuel). Classes: under 5 lb (2.3 kg) super ultralight, under 10 lb (4.5 kg) ultralight, under 20 lb (9 kg) lightweight, 20 lb+ traditional. Water weighs 1 kg per litre. " + DISCLAIMER,
    faq: [
      { question: "What is a good base weight?", answer: "Under 20 lb is comfortable for most; under 10 lb is ultralight." },
      { question: "Does worn clothing count?", answer: "No — base weight covers what's in or on the pack, not what you're wearing." },
    ],
  },
  {
    slug: "backpacking-food-calculator",
    title: "Backpacking Food Calculator",
    description: "Work out how many calories you need per day backpacking and how much food weight to pack for your trip (also a backpacking calories calculator).",
    metaTitle: "Backpacking Food Calculator — Calories & Food Weight",
    metaDescription: "Free backpacking food calculator. Get daily calories for backpacking and how many pounds of food to carry for your trip.",
    calcInputs: [dropdown("sex", "Sex", [["Male", 1], ["Female", 2]], 1), numberField("age", "Age", { default: 35, min: 10, max: 100 }), numberField("weight", "Body Weight", { default: 75, max: 300, step: 0.5 }), dropdown("weightUnit", "Weight Unit", [["kg", 1], ["lb", 2]], 1), numberField("height", "Height", { default: 175, min: 50, max: 250, step: 0.5 }), dropdown("heightUnit", "Height Unit", [["cm", 1], ["inches", 2]], 1), dropdown("intensity", "Trip Intensity", [["Easy (short days)", 1], ["Moderate (10–15 mi/day)", 2], ["Strenuous (big miles / climbing / cold)", 3]], 2), numberField("caloriesPerOunce", "Food Calorie Density (kcal per oz)", { default: 125, min: 50, max: 200 }), numberField("days", "Trip Days", { default: 4, max: 200 })],
    calcResult: { label: "Calories per Day", format: "number" },
    calcResults: [num("caloriesPerDay", "Calories per Day", true), num("foodPerDayOz", "Food per Day (oz)"), num("foodPerDayLb", "Food per Day (lb)"), num("totalFoodLb", "Total Food (lb)"), num("totalFoodKg", "Total Food (kg)"), num("totalCalories", "Total Calories for the Trip")],
    instructions: "Enter your details, how hard the trip will be, the calorie density of your food (check labels — 100–150 kcal per oz is typical) and the number of days.",
    examples: "Example: a 35-year-old man, 75 kg and 175 cm, on a moderate trip needs about 3,510 kcal a day. At 125 kcal/oz that's 1.76 lb of food a day — about 7 lb for 4 days.",
    assumptions: "Basal rate (Mifflin-St Jeor) × activity factor 1.8 easy, 2.1 moderate, 2.5 strenuous. Food weight = calories ÷ calorie density. Most hikers carry 1.5–2 lb a day. You can carry slightly less on the last day and for a first day starting after lunch. " + DISCLAIMER,
    faq: [
      { question: "How many calories do you burn backpacking?", answer: "Usually 3,000–5,000+ a day depending on body size, miles, climbing and cold." },
      { question: "What foods have the best calories per ounce?", answer: "Nuts, nut butters, olive oil, chocolate and dried meats are 150–250 kcal per ounce." },
    ],
  },
  {
    slug: "hiking-water-calculator",
    title: "Hiking Water Calculator",
    description: "Calculate how much water to drink and carry on a hike — by temperature, effort, altitude and distance between water sources.",
    metaTitle: "Hiking Water Calculator — How Much Water to Bring",
    metaDescription: "Free hiking water calculator. Estimate litres to drink and carry by hike length, heat, effort and water sources.",
    calcInputs: [numberField("hours", "Hiking Time (hours)", { default: 5, min: 0.5, max: 24, step: 0.5 }), dropdown("temperature", "Temperature", [["Cool (under 70°F / 21°C)", 1], ["Warm (70–85°F / 21–29°C)", 2], ["Hot (over 85°F / 29°C)", 3]], 2), dropdown("effort", "Effort", [["Easy", 1], ["Moderate", 2], ["Strenuous", 3]], 2), dropdown("highAltitude", "Above 8,000 ft / 2,500 m?", [["No", 1], ["Yes", 2]], 1), numberField("hoursBetweenSources", "Hours between Water Sources (0 = none)", { default: 3, max: 24, step: 0.5, required: false })],
    calcResult: { label: "Total Water", format: "number" },
    calcResults: [num("totalLitres", "Total Water to Drink (L)", true), num("totalOunces", "Total Water (fl oz)"), num("litresPerHour", "Litres per Hour"), num("litresToCarry", "Litres to Carry at Once"), num("carryWeightKg", "Water Weight (kg)"), num("carryWeightLb", "Water Weight (lb)")],
    instructions: "Enter how long you'll hike, the conditions and effort, and how many hours apart reliable water sources are (0 if there are none — carry it all).",
    examples: "Example: 5 hours in warm weather at a moderate effort → about 3.75 L (127 oz). With a source every 3 hours, carry 2.25 L at a time (about 5 lb).",
    assumptions: "Rule of thumb: about 0.5 L per hour in cool weather, 0.75 L in warm and 1 L in hot, × 0.8 easy / 1.25 strenuous, + 0.1 L per hour at altitude. Treat all natural water. Take electrolytes on long, hot days — drinking only water can lower blood sodium. " + DISCLAIMER,
    faq: [
      { question: "How much water should I bring for a day hike?", answer: "About half a litre per hour in mild weather — 2–3 litres for most day hikes, more in heat." },
      { question: "How can I tell if I'm drinking enough?", answer: "Pale urine and steady energy; dark urine, headache or dizziness mean you need more." },
    ],
  },
  {
    slug: "tent-size-calculator",
    title: "Tent Size Calculator",
    description: "Find the right tent size for your group — floor area, the person rating to buy and the length you need for the tallest sleeper.",
    metaTitle: "Tent Size Calculator — What Size Tent Do I Need?",
    metaDescription: "Free tent size calculator. Get the floor area, person rating and length you need for your group, dogs and gear.",
    calcInputs: [numberField("people", "People", { default: 2, min: 1, max: 12 }), dropdown("comfort", "Comfort", [["Minimalist / backpacking", 1], ["Standard", 2], ["Roomy / car camping", 3]], 2), numberField("dogs", "Dogs", { default: 0, max: 4, required: false }), dropdown("gearInside", "Gear Stored Inside?", [["No — in the vestibule", 1], ["Yes", 2]], 1), numberField("tallestHeight", "Tallest Person's Height", { default: 72, min: 30, max: 250 }), dropdown("heightUnit", "Height Unit", [["cm", 1], ["inches", 2]], 2)],
    calcResult: { label: "Person Rating", format: "number" },
    calcResults: [num("tentPersonRating", "Tent Person Rating to Buy", true), num("floorAreaSqFt", "Floor Area Needed (sq ft)"), num("floorAreaSqM", "Floor Area Needed (m²)"), num("minFloorLengthInches", "Minimum Floor Length (in)"), num("minFloorLengthCm", "Minimum Floor Length (cm)")],
    instructions: "Enter how many people (and dogs) will sleep in it, how much space you like, whether gear goes inside and the tallest person's height.",
    examples: "Example: two people wanting standard space need about 36 sq ft — a 3-person tent (most \"2-person\" tents are only 28–30 sq ft). A 6 ft sleeper needs a floor at least 84\" long.",
    assumptions: "Floor area per person: minimalist 14, standard 18, roomy 22 sq ft; + 8 sq ft per dog; + 5 sq ft per person for gear inside. Manufacturers rate about 14–15 sq ft per person, so the rating is area ÷ 14.5, rounded up. Length = tallest height + 12\". " + DISCLAIMER,
    faq: [
      { question: "Should I size up my tent?", answer: "Many campers buy one size up (e.g. a 3-person for two) for space for gear and comfort — at the cost of weight." },
      { question: "What is a vestibule for?", answer: "A covered area outside the door for boots and packs, so they stay dry without taking floor space." },
    ],
  },
  {
    slug: "trekking-pole-length-calculator",
    title: "Trekking Pole Length Calculator",
    description: "Find the right trekking pole length for your height — on flat ground, uphill and downhill — and which fixed-length pole to buy.",
    metaTitle: "Trekking Pole Length Calculator — By Height",
    metaDescription: "Free trekking pole length calculator. Get pole length for your height on flat ground, uphill and downhill, plus fixed-pole size.",
    calcInputs: [numberField("height", "Height", { default: 175, min: 80, max: 250, step: 0.5 }), dropdown("heightUnit", "Height Unit", [["cm", 1], ["inches", 2]], 1)],
    calcResult: { label: "Flat-Ground Length", format: "number" },
    calcResults: [num("flatLengthCm", "Flat-Ground Length (cm)", true), num("flatLengthInches", "Flat-Ground Length (in)"), num("uphillLengthCm", "Uphill Length (cm)"), num("downhillLengthCm", "Downhill Length (cm)"), num("fixedPoleSizeCm", "Fixed-Length Pole Size (cm)")],
    instructions: "Enter your height. Check by holding the pole with the tip by your foot: your elbow should bend about 90°.",
    examples: "Example: at 175 cm, set the poles to about 119 cm on the flat, 112 cm uphill and 127 cm downhill — or buy 120 cm fixed poles.",
    assumptions: "Flat length ≈ 0.68 × height (elbow at 90°); shorten about 5–10 cm on climbs and lengthen 5–10 cm on descents. Fixed poles are sold in 5 cm steps. " + DISCLAIMER,
    faq: [
      { question: "Should trekking poles be the same length?", answer: "Yes, usually — except on long traverses, when the uphill-side pole can be a little shorter." },
      { question: "Do trekking poles really help?", answer: "Yes — they take load off the knees on descents, help balance on rough ground and keep a steady rhythm." },
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
