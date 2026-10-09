// One-time (but safe to re-run) batch setup script: creates the 14 tools of
// the cycling sub-batch D (Rides, Climbing, Energy & E-Bikes). See
// src/lib/calc-engine-cycling-fit.ts for the full list
// of 4 sub-batches (47 tools under Sports Calculators > Cycling
// Calculators), and src/lib/calc-engine-cycling-ride.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-cycling-ride-calculators.ts
// or
//   npm run db:create-cycling-ride-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Cycling Calculators", slug: "cycling-calculators" };

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
  "Estimates for planning and training. Bike fit, sizing and equipment numbers are starting points: check manufacturer specifications and torque limits, and consider a professional fit. Exercise and nutrition figures are general guidance, not medical advice.";

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
const WEIGHT = (def = 70) => [numberField("weight", "Body Weight", { default: def, max: 250, step: 0.5 }), dropdown("weightUnit", "Weight Unit", [["kg", 1], ["lb", 2]], 1)];

const TOOLS: ToolDef[] = [
  {
    slug: "bike-pace-calculator",
    title: "Bike Pace Calculator",
    description: "Calculate cycling average speed and pace from distance and time — and how long a ride takes at a target speed (also a cycling time and bike mileage calculator).",
    metaTitle: "Bike Pace Calculator — Cycling Speed & Time",
    metaDescription: "Free bike pace calculator. Get average speed and pace from distance and time, plus ride time at a target speed.",
    calcInputs: [numberField("distance", "Distance (km or miles)", { default: 40, max: 5000, step: 0.1 }), numberField("hours", "Time — Hours", { default: 1, max: 200 }), numberField("minutes", "Time — Minutes", { default: 20, max: 59 }), numberField("seconds", "Time — Seconds", { default: 0, max: 59 }), numberField("targetSpeed", "Target Speed (km/h or mph)", { default: 30, min: 1, max: 100, step: 0.5 })],
    calcResult: { label: "Average Speed", format: "number" },
    calcResults: [num("averageSpeed", "Average Speed (per Hour)", true), num("paceMinutes", "Pace — Minutes per km/mile"), num("paceSeconds", "Pace — Seconds"), num("timeAtTargetSpeedMinutes", "Time for This Distance at Target Speed (min)"), num("distanceIn3Hours", "Distance in 3 Hours at This Speed")],
    instructions: "Enter the distance and time (use kilometres or miles consistently) and a target speed to see how long the same ride would take.",
    examples: "Example: 40 km in 1 hour 20 minutes is 30 km/h — a 2:00 per km pace. At 30 km/h you'd cover 90 km in 3 hours.",
    assumptions: "Speed = distance ÷ moving time. Stops, traffic lights and climbs lower real averages — use moving time from your head unit for training comparisons. " + DISCLAIMER,
    faq: [
      { question: "What is a good average cycling speed?", answer: "About 20–25 km/h (12–15 mph) for recreational riders, 28–32 km/h (17–20 mph) for fit club riders on flat roads." },
      { question: "How long does it take to cycle 10 km?", answer: "About 30 minutes at 20 km/h, or 24 minutes at 25 km/h." },
    ],
  },
  {
    slug: "stationary-bike-distance-calculator",
    title: "Stationary Bike Distance Calculator",
    description: "Estimate the outdoor-equivalent distance of an indoor or stationary bike workout from average power or the bike's speed reading.",
    metaTitle: "Stationary Bike Distance Calculator",
    metaDescription: "Free stationary bike distance calculator. Estimate road-equivalent km and miles from watts or speed and workout time.",
    calcInputs: [dropdown("mode", "I Know…", [["Average power (watts)", 1], ["The bike's speed reading", 2]], 1), numberField("averageWatts", "Average Power (W)", { default: 150, max: 1000 }), numberField("displayedSpeedKmh", "Displayed Speed (km/h)", { default: 25, max: 80, step: 0.1 }), numberField("minutes", "Workout Time (min)", { default: 45, max: 600 })],
    calcResult: { label: "Distance", format: "number" },
    calcResults: [num("distanceKm", "Equivalent Distance (km)", true), num("distanceMiles", "Equivalent Distance (miles)"), num("equivalentSpeedKmh", "Equivalent Flat-Road Speed (km/h)"), num("equivalentSpeedMph", "Equivalent Speed (mph)")],
    instructions: "Enter your average watts (from a smart trainer or bike console) and workout time — or the speed the bike shows if it doesn't report power.",
    examples: "Example: 45 minutes at 150 W is about 22.9 km (14.2 miles) of flat road riding — about 30.5 km/h.",
    assumptions: "Power-based distance uses flat-road physics for an 80 kg rider and bike on the hoods (CdA 0.32, Crr 0.004, still air). Spin-bike speed readings aren't standardised, so treat them as rough. " + DISCLAIMER,
    faq: [
      { question: "Is stationary bike distance accurate?", answer: "Only roughly — without wind, hills and coasting, distance depends on how the bike converts effort to speed." },
      { question: "How far is 30 minutes on a stationary bike?", answer: "At a moderate 150 W, about 15 km (9.5 miles) of flat-road equivalent." },
    ],
  },
  {
    slug: "cycling-elevation-gain-calculator",
    title: "Cycling Elevation Gain Calculator",
    description: "Calculate elevation gain from climb distance and average gradient — in metres, feet and floors — plus your climbing rate.",
    metaTitle: "Cycling Elevation Gain Calculator",
    metaDescription: "Free cycling elevation gain calculator. Get climbing in metres and feet from distance and gradient, plus floors and climb rate.",
    calcInputs: [numberField("climbDistanceKm", "Climbing Distance (km)", { default: 20, max: 500, step: 0.1 }), numberField("averageGradientPercent", "Average Gradient (%)", { default: 4, max: 30, step: 0.1 }), numberField("rideHours", "Ride Time (hours)", { default: 2, max: 48, step: 0.1 })],
    calcResult: { label: "Elevation Gain", format: "number" },
    calcResults: [num("elevationGainM", "Elevation Gain (m)", true), num("elevationGainFt", "Elevation Gain (ft)"), num("equivalentFloors", "Equivalent Building Floors (3 m)"), num("climbingRateMPerHour", "Climbing Rate (m per Hour)")],
    instructions: "Enter the total uphill distance and its average gradient, plus your ride time.",
    examples: "Example: 20 km of climbing at an average 4% is 800 m (2,625 ft) of elevation gain — about 267 floors.",
    assumptions: "Gain = uphill distance × gradient (road distance is close enough to horizontal distance at cycling gradients). GPS units often over- or under-report elevation by 5–15%; barometric altimeters are more accurate. " + DISCLAIMER,
    faq: [
      { question: "How much elevation is a hilly ride?", answer: "As a rule of thumb, 10 m per km (1,000 m per 100 km) is hilly; 20 m/km is mountainous." },
      { question: "How do I estimate a route's climbing?", answer: "Use a route planner (Strava, RideWithGPS, Komoot) — they use terrain models for elevation." },
    ],
  },
  {
    slug: "cycling-gradient-calculator",
    title: "Cycling Gradient Calculator",
    description: "Calculate a climb's average gradient from elevation gain and distance — with its angle, difficulty and Strava-style climb category (Cat 4 to HC).",
    metaTitle: "Cycling Gradient Calculator — Climb Category",
    metaDescription: "Free cycling gradient calculator. Get average gradient %, angle, difficulty and Strava-style climb category from elevation and distance.",
    calcInputs: [numberField("elevationGainM", "Elevation Gain (m)", { default: 300, max: 5000 }), numberField("distanceKm", "Climb Length (km)", { default: 5, min: 0.01, max: 100, step: 0.1 })],
    calcResult: { label: "Gradient", format: "percentage" },
    calcResults: [pct("gradientPercent", "Average Gradient", true), num("angleDegrees", "Angle (°)"), num("difficulty", "Difficulty (1 Easy … 5 Extreme)"), num("climbScore", "Climb Score (Length m × Grade %)"), num("climbCategory", "Category (0 None, 1 Cat 4, 2 Cat 3, 3 Cat 2, 4 Cat 1, 5 HC)")],
    instructions: "Enter the height gained and the length of the climb.",
    examples: "Example: 300 m of climbing over 5 km is a 6% average gradient (3.4°) — a Cat 3 climb with a score of 30,000.",
    assumptions: "Gradient = rise ÷ distance × 100. Difficulty: < 3% easy, 3–6% moderate, 6–9% hard, 9–12% very hard, 12%+ extreme. Category by score (length × grade): 8,000 Cat 4, 16,000 Cat 3, 32,000 Cat 2, 64,000 Cat 1, 80,000 HC (Strava-style; pro races categorise climbs differently). " + DISCLAIMER,
    faq: [
      { question: "How steep is a 10% gradient?", answer: "10 m up for every 100 m along — steep enough that most riders need their lowest gears." },
      { question: "What makes a climb HC?", answer: "Hors catégorie — beyond categorisation — long, steep climbs like Alpe d'Huez (13.8 km at 8.1%)." },
    ],
  },
  {
    slug: "vam-calculator",
    title: "VAM Calculator",
    description: "Calculate VAM (velocità ascensionale media — average climbing speed in metres per hour) and estimate the W/kg behind it.",
    metaTitle: "VAM Calculator — Climbing Speed & W/kg",
    metaDescription: "Free VAM calculator. Get vertical metres per hour from elevation gain and time and estimate W/kg with Ferrari's formula.",
    calcInputs: [numberField("elevationGainM", "Elevation Gain (m)", { default: 800, max: 5000 }), numberField("minutes", "Climb Time (min)", { default: 40, min: 1, max: 600, step: 0.1 }), numberField("gradientPercent", "Average Gradient (%)", { default: 8, max: 25, step: 0.1 })],
    calcResult: { label: "VAM", format: "number" },
    calcResults: [num("vamMetresPerHour", "VAM (m/h)", true), num("estimatedWattsPerKg", "Estimated W/kg"), num("level", "Level (1 Recreational … 5 Pro)")],
    instructions: "Enter the height climbed, how long it took and the climb's average gradient.",
    examples: "Example: climbing 800 m in 40 minutes is a VAM of 1,200 m/h — about 4.3 W/kg on an 8% climb, a strong amateur effort.",
    assumptions: "VAM = metres climbed ÷ hours. W/kg ≈ VAM ÷ ((2 + gradient ÷ 10) × 100) (Michele Ferrari's estimate — less accurate on shallow climbs, in wind or drafting). Levels: < 700 recreational, 700–1,000 fit, 1,000–1,300 strong amateur, 1,300–1,600 elite amateur, 1,600+ pro. " + DISCLAIMER,
    faq: [
      { question: "What VAM do pros climb at?", answer: "Grand Tour leaders often climb at 1,600–1,800 m/h on decisive climbs." },
      { question: "Why does gradient matter for W/kg?", answer: "On shallow climbs more power goes to air drag and less to lifting, so the same VAM needs more power." },
    ],
  },
  {
    slug: "biking-calorie-calculator",
    title: "Biking Calorie Calculator",
    description: "Estimate calories burned cycling — road riding by speed, mountain biking or e-biking — or from average power if you have a power meter (also an ebike calorie calculator).",
    metaTitle: "Biking Calorie Calculator — Calories Burned Cycling",
    metaDescription: "Free biking calorie calculator. Estimate calories burned cycling by speed, mountain biking, e-bike or from your average watts.",
    calcInputs: [...WEIGHT(), numberField("minutes", "Ride Time (min)", { default: 60, max: 1440 }), dropdown("rideType", "Ride Type", [["Leisure, under 16 km/h (10 mph)", 1], ["16–19 km/h (10–12 mph)", 2], ["19–22 km/h (12–14 mph)", 3], ["22–25 km/h (14–16 mph)", 4], ["25–30 km/h (16–19 mph)", 5], ["Over 32 km/h (20 mph), racing", 6], ["Mountain biking", 7], ["E-bike (pedal assist)", 8]], 3), numberField("averageWatts", "Average Power (W, Optional — Overrides Ride Type)", { default: 0, max: 1000, required: false })],
    calcResult: { label: "Calories Burned", format: "number" },
    calcResults: [num("caloriesBurned", "Calories Burned", true), num("caloriesPerHour", "Calories per Hour"), num("metUsed", "MET Used (0 = Power-Based)")],
    instructions: "Enter your weight, ride time and ride type — or your average power from a power meter for a more accurate number.",
    examples: "Example: a 70 kg rider at 19–22 km/h for an hour burns about 560 calories. With a power meter, 200 W for an hour ≈ 720 calories.",
    assumptions: "MET method: calories = MET × kg × hours (Compendium of Physical Activities: 4.0 leisure up to 15.8 racing, 8.5 MTB; e-bike assisted riding ≈ 5.5, an estimate). Power method: kJ of work ≈ kcal burned, because the body is about 24% efficient. " + DISCLAIMER,
    faq: [
      { question: "Do you burn calories on an e-bike?", answer: "Yes — typically 60–80% of a regular bike at the same speed, depending on the assist level." },
      { question: "Why does a power meter give a better estimate?", answer: "It measures the actual work you did instead of assuming effort from speed." },
    ],
  },
  {
    slug: "stationary-bike-calorie-calculator",
    title: "Stationary Bike Calorie Calculator",
    description: "Estimate calories burned on a stationary or exercise bike from intensity (watts band) or the bike's average power reading.",
    metaTitle: "Stationary Bike Calorie Calculator",
    metaDescription: "Free stationary bike calorie calculator. Estimate calories burned on an exercise bike by intensity or average watts.",
    calcInputs: [...WEIGHT(), numberField("minutes", "Workout Time (min)", { default: 45, max: 600 }), dropdown("intensity", "Intensity", [["Very light (30–50 W)", 1], ["Light (51–89 W)", 2], ["Moderate (90–100 W)", 3], ["Vigorous (101–160 W)", 4], ["Very vigorous (161–200 W)", 5], ["Very hard (201–270 W)", 6]], 3), numberField("averageWatts", "Average Power (W, Optional — Overrides Intensity)", { default: 0, max: 1000, required: false })],
    calcResult: { label: "Calories Burned", format: "number" },
    calcResults: [num("caloriesBurned", "Calories Burned", true), num("caloriesPerHour", "Calories per Hour"), num("metUsed", "MET Used (0 = Power-Based)")],
    instructions: "Enter your weight, workout time and intensity — or the average watts the bike shows.",
    examples: "Example: a 70 kg person riding a stationary bike at a moderate 90–100 W for 45 minutes burns about 357 calories.",
    assumptions: "Compendium of Physical Activities stationary-cycling METs: 3.5, 4.8, 6.8, 8.8, 11.0 and 14.0 by watts band; calories = MET × kg × hours. With average watts, calories ≈ kJ of work. Gym-bike calorie displays often overestimate. " + DISCLAIMER,
    faq: [
      { question: "How many calories does 30 minutes on a stationary bike burn?", answer: "About 200–300 for most people at moderate effort." },
      { question: "Is a spin class more calories?", answer: "Usually — classes often average vigorous effort (8.5+ METs), around 500–700 calories an hour." },
    ],
  },
  {
    slug: "cycling-nutrition-calculator",
    title: "Cycling Nutrition Calculator",
    description: "Plan how many carbs per hour to eat on a ride — total carbs, gels and pre-ride carbs — by ride length and intensity (also a carbs per hour cycling calculator).",
    metaTitle: "Cycling Nutrition Calculator — Carbs per Hour",
    metaDescription: "Free cycling nutrition calculator. Get carbs per hour, total carbs, gels needed and pre-ride carbs by ride length and intensity.",
    calcInputs: [numberField("hours", "Ride Duration (hours)", { default: 3, max: 48, step: 0.25 }), dropdown("intensity", "Intensity", [["Easy / endurance", 1], ["Moderate / tempo", 2], ["Hard / race", 3]], 2), ...WEIGHT(), dropdown("gutTrained", "Gut Trained for High Carbs?", [["No", 0], ["Yes", 1]], 0)],
    calcResult: { label: "Carbs per Hour", format: "number" },
    calcResults: [num("carbsPerHourG", "Carbs per Hour (g)", true), num("totalCarbsG", "Total Carbs for the Ride (g)"), num("gelsNeeded", "Gels Needed (25 g Each)"), num("carbCaloriesPerHour", "Carb Calories per Hour"), num("preRideCarbsG", "Pre-Ride Meal Carbs (2 g/kg)")],
    instructions: "Enter the ride length and intensity, your weight, and whether you've practised taking high carb amounts.",
    examples: "Example: a 3-hour moderate ride needs about 75 g of carbs per hour — 225 g in total, roughly 9 gels or a mix of drink, bars and gels.",
    assumptions: "Sports-nutrition guidance: under 1 hour none needed; 1–2.5 hours 30–60 g/h; over 2.5 hours 60–90 g/h, and up to 90–120 g/h for gut-trained athletes racing (using glucose + fructose mixes). Pre-ride meal 1–4 g/kg, 1–4 hours before. Individual tolerance varies — practise in training. " + DISCLAIMER,
    faq: [
      { question: "How many carbs per hour cycling?", answer: "30–60 g for most rides over an hour, 60–90 g for long or hard rides." },
      { question: "Why mix glucose and fructose?", answer: "They use different gut transporters, so together you can absorb more than about 60 g/h." },
    ],
  },
  {
    slug: "cycling-hydration-calculator",
    title: "Cycling Hydration Calculator",
    description: "Estimate how much to drink while cycling — fluid per hour, bottles and sodium — from ride time, temperature, intensity and your sweat rate.",
    metaTitle: "Cycling Hydration Calculator — Fluid & Sodium",
    metaDescription: "Free cycling hydration calculator. Get fluid per hour, bottles and sodium from ride time, temperature, intensity or sweat rate.",
    calcInputs: [numberField("hours", "Ride Duration (hours)", { default: 2, max: 48, step: 0.25 }), ...WEIGHT(), numberField("temperatureC", "Temperature (°C)", { default: 25, min: -10, max: 50 }), dropdown("intensity", "Intensity", [["Easy", 1], ["Moderate", 2], ["Hard", 3]], 2), numberField("sweatRateLPerHour", "Measured Sweat Rate (L/h, Optional)", { default: 0, max: 4, step: 0.05, required: false })],
    calcResult: { label: "Fluid per Hour", format: "number" },
    calcResults: [num("fluidPerHourMl", "Drink per Hour (ml)", true), num("totalFluidL", "Total Fluid (L)"), num("bottles750ml", "750 ml Bottles"), num("sodiumPerHourMg", "Sodium per Hour (mg)"), pct("weightLossIfNoDrinkPercent", "Body Weight Lost if You Don't Drink")],
    instructions: "Enter ride time, weight, temperature and intensity. For accuracy, weigh yourself before and after an hour's ride without drinking: each kg lost ≈ 1 L of sweat per hour.",
    examples: "Example: a 2-hour moderate ride at 25 °C — drink about 520 ml per hour (just over 1 L total, two bottles) with about 470 mg of sodium per hour.",
    assumptions: "Estimated sweat rate 0.5 L/h at 20 °C, +0.03 L/h per °C and ±0.2 L/h for intensity; aim to replace about 80% (keep losses under 2% of body weight). Sodium assumes about 900 mg per litre of sweat (salty sweaters lose more). Don't over-drink — gaining weight on a ride risks hyponatraemia. " + DISCLAIMER,
    faq: [
      { question: "How much should I drink on a bike ride?", answer: "Typically 400–800 ml per hour, more in heat — drink to thirst on short rides and to a plan on long hot ones." },
      { question: "Do I need electrolytes?", answer: "For rides over about 2 hours or in heat, yes — sodium helps you absorb and retain fluid." },
    ],
  },
  {
    slug: "cycling-to-running-conversion-calculator",
    title: "Cycling to Running Conversion Calculator",
    description: "Convert cycling distance into an equivalent running distance — for training logs, challenges and cross-training.",
    metaTitle: "Cycling to Running Conversion Calculator",
    metaDescription: "Free cycling to running conversion calculator. Convert bike distance to equivalent running distance by ride type.",
    calcInputs: [numberField("cyclingDistance", "Cycling Distance (km or miles)", { default: 30, max: 2000, step: 0.1 }), dropdown("rideType", "Ride Type", [["Typical road ride (3:1)", 1], ["Easy, flat or drafting (4:1)", 2], ["Hilly road or mountain bike (2:1)", 3]], 1)],
    calcResult: { label: "Running Equivalent", format: "number" },
    calcResults: [num("runningEquivalent", "Equivalent Running Distance", true), num("ratioUsed", "Cycling : Running Ratio"), num("cyclingNeededFor10", "Cycling Needed to Equal a 10 km/mi Run")],
    instructions: "Enter the distance you rode (km or miles) and choose the type of ride.",
    examples: "Example: a 30 km road ride is roughly equal to a 10 km run.",
    assumptions: "Common rule-of-thumb ratios: about 3 units of road cycling per unit of running, 4:1 for easy or drafted riding and 2:1 for hilly or off-road riding. Based on similar energy cost and training time, not identical training effects — cycling has much less impact stress. " + DISCLAIMER,
    faq: [
      { question: "Is 1 mile running equal to 3 miles cycling?", answer: "Roughly, at moderate effort on flat roads — the 3:1 ratio is the most common rule of thumb." },
      { question: "Does cycling help running?", answer: "Yes — it builds aerobic fitness with less impact, but running-specific strength still needs running." },
    ],
  },
  {
    slug: "step-conversion-calculator",
    title: "Step Conversion Calculator",
    description: "Convert cycling time into equivalent steps for step-count goals and fitness trackers — by riding intensity.",
    metaTitle: "Step Conversion Calculator — Cycling to Steps",
    metaDescription: "Free cycling to steps conversion calculator. Convert bike or stationary bike minutes into equivalent steps by intensity.",
    calcInputs: [numberField("minutes", "Cycling Time (min)", { default: 45, max: 1440 }), dropdown("intensity", "Intensity", [["Light (100 steps/min)", 1], ["Moderate (150 steps/min)", 2], ["Vigorous (200 steps/min)", 3]], 2)],
    calcResult: { label: "Equivalent Steps", format: "number" },
    calcResults: [num("equivalentSteps", "Equivalent Steps", true), num("stepsPerMinute", "Steps per Minute Used"), num("walkingDistanceKm", "Walking Distance Equivalent (km)"), num("minutesFor10000Steps", "Minutes of Cycling for 10,000 Steps")],
    instructions: "Enter how long you cycled (outdoors or on a stationary bike) and the intensity.",
    examples: "Example: 45 minutes of moderate cycling is about 6,750 steps — roughly 5 km of walking.",
    assumptions: "Step equivalents based on matching energy use: about 100 steps/min light, 150 moderate and 200 vigorous (commonly used by step challenges). Walking distance uses a 76 cm stride. Fitness trackers vary in how they credit cycling. " + DISCLAIMER,
    faq: [
      { question: "Does cycling count toward 10,000 steps?", answer: "Many trackers don't count pedalling as steps — converting by time and intensity lets you credit the activity fairly." },
      { question: "How many steps is a mile of cycling?", answer: "Roughly 500–900 step-equivalents per mile at moderate speeds, depending on effort." },
    ],
  },
  {
    slug: "electric-bike-range-calculator",
    title: "Electric Bike Range Calculator",
    description: "Estimate how far your e-bike will go on a charge from battery voltage and amp-hours, assist level, terrain and rider weight — plus battery Wh, charge time and cost (also an ebike battery calculator).",
    metaTitle: "Electric Bike Range Calculator — E-Bike Battery",
    metaDescription: "Free e-bike range calculator. Estimate range from battery V and Ah, assist level, terrain and weight, plus Wh, charge time and cost.",
    calcInputs: [numberField("batteryVolts", "Battery Voltage (V)", { default: 36, min: 12, max: 72 }), numberField("batteryAh", "Battery Capacity (Ah)", { default: 13, min: 1, max: 50, step: 0.5 }), dropdown("assistLevel", "Assist Level", [["Eco (~6 Wh/km)", 1], ["Tour (~9 Wh/km)", 2], ["Sport (~13 Wh/km)", 3], ["Turbo / throttle (~18 Wh/km)", 4]], 2), dropdown("terrain", "Terrain", [["Flat", 1], ["Rolling", 2], ["Hilly", 3]], 1), numberField("riderWeightKg", "Rider + Cargo Weight (kg)", { default: 75, max: 200 }), numberField("chargerAmps", "Charger Output (A)", { default: 4, min: 0.1, max: 20, step: 0.5 }), currencyField("electricityPrice", "Electricity Price per kWh", { default: 0.15, max: 5, step: 0.01 })],
    calcResult: { label: "Range", format: "number" },
    calcResults: [num("rangeKm", "Estimated Range (km)", true), num("rangeMiles", "Estimated Range (miles)"), num("batteryWh", "Battery Capacity (Wh)"), num("whPerKm", "Energy Use (Wh/km)"), num("chargeTimeHours", "Full Charge Time (h)"), cur("costPerFullCharge", "Cost per Full Charge")],
    instructions: "Enter the battery's voltage and amp-hours (printed on the battery), your usual assist level, terrain and weight, plus your charger's output and electricity price.",
    examples: "Example: a 36 V 13 Ah (468 Wh) battery in Tour mode on flat roads with a 75 kg rider goes about 47 km (29 miles); a full charge takes about 3.7 hours on a 4 A charger and costs about $0.08.",
    assumptions: "Range = 90% of battery Wh ÷ energy per km; assist levels 6–18 Wh/km, ×1.2 for rolling and ×1.45 for hilly terrain, adjusted for weight. Cold weather, wind, tire pressure and battery age can cut range by 20–40%. " + DISCLAIMER,
    faq: [
      { question: "How do I work out e-bike battery Wh?", answer: "Multiply volts by amp-hours — 36 V × 13 Ah = 468 Wh." },
      { question: "How can I get more range?", answer: "Use lower assist, pedal at a higher cadence, keep tires pumped up and avoid full throttle starts." },
    ],
  },
  {
    slug: "ebike-speed-calculator",
    title: "Ebike Speed Calculator",
    description: "Estimate a hub-motor e-bike's top speed from motor kV, battery voltage and wheel size — and compare it with legal e-bike class limits.",
    metaTitle: "Ebike Speed Calculator — Hub Motor Top Speed",
    metaDescription: "Free e-bike speed calculator. Estimate hub motor top speed from kV, voltage and wheel size and check it against class limits.",
    calcInputs: [numberField("motorKv", "Motor kV (rpm per Volt)", { default: 9, min: 1, max: 100, step: 0.1 }), numberField("voltage", "Battery Voltage (V)", { default: 48, min: 12, max: 100 }), numberField("wheelDiameterIn", "Wheel Diameter (in)", { default: 26, min: 10, max: 30, step: 0.5 }), percentField("loadPercent", "Loaded Speed (% of No-Load)", { default: 85, min: 50, max: 100 }), dropdown("legalClass", "Compare With", [["US Class 1 / 2 (20 mph)", 1], ["US Class 3 (28 mph)", 2], ["EU / UK EPAC (25 km/h)", 3]], 1)],
    calcResult: { label: "Top Speed", format: "number" },
    calcResults: [num("topSpeedKmh", "Estimated Top Speed (km/h)", true), num("topSpeedMph", "Estimated Top Speed (mph)"), num("wheelRpm", "Wheel RPM Under Load"), num("assistLimitKmh", "Assist Limit (km/h)"), num("exceedsAssistLimit", "Exceeds Limit (1 Yes)")],
    instructions: "Enter the hub motor's kV (rpm per volt), battery voltage and wheel diameter, and choose the class limit you ride under.",
    examples: "Example: a 9 kV hub motor on 48 V with 26 in wheels reaches about 28 mph (46 km/h) under load — above the 20 mph Class 1/2 limit, so the controller must cap assistance.",
    assumptions: "Wheel rpm = kV × volts × loaded share (about 85% of no-load speed); speed = rpm × wheel circumference. Mid-drive speed depends on gearing instead. US classes: 1 & 2 assist to 20 mph, Class 3 to 28 mph; EU/UK pedelecs to 25 km/h. Check your local laws. " + DISCLAIMER,
    faq: [
      { question: "How fast can an e-bike legally go?", answer: "Motor assistance stops at 20 mph (Class 1/2) or 28 mph (Class 3) in the US and 25 km/h in the EU and UK — you can pedal faster unassisted." },
      { question: "Does a higher voltage make an e-bike faster?", answer: "Yes — hub motor speed rises roughly in proportion to voltage." },
    ],
  },
  {
    slug: "biking-vs-driving-calculator",
    title: "Biking vs Driving Calculator",
    description: "Compare commuting by bike with driving — yearly cost and savings, CO₂ avoided, calories burned and extra travel time.",
    metaTitle: "Biking vs Driving Calculator — Commute Savings",
    metaDescription: "Free biking vs driving calculator. Compare yearly commute cost, savings, CO2 avoided, calories and time for bike vs car.",
    calcInputs: [
      numberField("oneWayKm", "One-Way Commute (km)", { default: 10, max: 200, step: 0.5 }),
      numberField("daysPerWeek", "Days per Week", { default: 5, max: 7 }),
      numberField("weeksPerYear", "Weeks per Year", { default: 48, max: 52 }),
      currencyField("carCostPerKm", "Car Running Cost per km (Fuel, Wear)", { default: 0.25, max: 5, step: 0.01 }),
      currencyField("parkingPerDay", "Parking per Day", { default: 5, max: 200, step: 0.5 }),
      currencyField("bikeCostPerKm", "Bike Cost per km (Maintenance)", { default: 0.05, max: 2, step: 0.01 }),
      numberField("carCo2GPerKm", "Car CO₂ (g/km)", { default: 170, max: 500 }),
      numberField("riderWeightKg", "Your Weight (kg)", { default: 70, max: 250 }),
      numberField("bikeSpeedKmh", "Average Bike Speed (km/h)", { default: 18, min: 1, max: 50 }),
      numberField("carSpeedKmh", "Average Car Speed in Traffic (km/h)", { default: 35, min: 1, max: 120 }),
    ],
    calcResult: { label: "Annual Savings", format: "currency" },
    calcResults: [cur("annualSavings", "Yearly Savings by Biking", true), cur("carCostPerYear", "Car Cost per Year"), cur("bikeCostPerYear", "Bike Cost per Year"), num("co2SavedKg", "CO₂ Avoided (kg/year)"), num("caloriesPerYear", "Calories Burned per Year"), num("extraMinutesPerTrip", "Extra Minutes per Trip by Bike")],
    instructions: "Enter your commute distance and frequency, car and bike running costs, parking, your car's CO₂ rating, your weight and typical speeds.",
    examples: "Example: a 10 km commute 5 days a week for 48 weeks saves about $2,160 a year, avoids 816 kg of CO₂ and burns about 127,000 calories — for about 16 extra minutes per trip.",
    assumptions: "Two trips per day; car cost = distance × running cost + parking; calories use 6.8 METs (moderate cycling). Use your own car's cost per km (fuel, tyres, servicing — about $0.20–0.35 for a typical car). For e-bike specifics see the E-Bike vs Car Commute Calculator. " + DISCLAIMER,
    faq: [
      { question: "How much can I save by biking to work?", answer: "Often $1,000–3,000 a year for a 5–15 km commute, more if you pay for parking or can sell a car." },
      { question: "Is biking to work faster in cities?", answer: "For trips under about 5 km in congested cities, bikes are often as fast or faster door to door." },
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
