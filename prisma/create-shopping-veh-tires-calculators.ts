// One-time (but safe to re-run) batch setup script: creates 13 tire, towing and car care tools
// from the user's shopping list (Shopping Calculators > Vehicle, Resale & Collectibles Calculators).
// See src/lib/calc-engine-shopping-veh-tires.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-veh-tires-calculators.ts
// or
//   npm run db:create-shopping-veh-tires-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Vehicle, Resale & Collectibles Calculators", slug: "vehicle-resale-collectibles-calculators" };

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

const TOOLS: ToolDef[] = [
  {
    slug: "tire-size-calculator",
    title: "Tire Size Calculator",
    description: "Compare your current tire size with a new one — overall diameter, percentage difference, speedometer error and revolutions per mile — before you upsize or change wheels.",
    metaTitle: "Tire Size Calculator — Compare Tire Sizes",
    metaDescription: "Free tire size calculator. Compare two tire sizes for diameter difference, speedometer error and revs per mile before you swap.",
    calcInputs: [
      numberField("width1", "Current Tire Width", { unit: "mm", default: 225, min: 100, max: 400, step: 5 }),
      numberField("aspect1", "Current Aspect Ratio", { unit: "%", default: 65, min: 20, max: 90, step: 5 }),
      numberField("rim1", "Current Rim Diameter", { unit: "in", default: 17, min: 10, max: 30, step: 1 }),
      numberField("width2", "New Tire Width", { unit: "mm", default: 235, min: 100, max: 400, step: 5 }),
      numberField("aspect2", "New Aspect Ratio", { unit: "%", default: 60, min: 20, max: 90, step: 5 }),
      numberField("rim2", "New Rim Diameter", { unit: "in", default: 18, min: 10, max: 30, step: 1 }),
    ],
    calcResult: { label: "Diameter Difference", format: "percentage" },
    calcResults: [
      { key: "diameterDifferencePercent", label: "Overall Diameter Difference (%)", format: "percentage", highlight: true },
      { key: "currentDiameterIn", label: "Current Tire Diameter (in)", format: "number" },
      { key: "newDiameterIn", label: "New Tire Diameter (in)", format: "number" },
      { key: "actualSpeedAt60", label: "Actual Speed When Speedometer Shows 60 mph", format: "number" },
      { key: "newRevsPerMile", label: "New Tire Revolutions per Mile", format: "number" },
      { key: "widthDifferenceIn", label: "Width Difference (in)", format: "number" },
    ],
    instructions: "Read both sizes from the tire sidewall — for 225/65R17, the width is 225 mm, the aspect ratio 65% and the rim 17 inches — and enter your current and proposed sizes.",
    examples: "Example: going from 225/65R17 to 235/60R18 changes the overall diameter by 2.06%; at an indicated 60 mph you'd actually be doing 61.23 mph.",
    assumptions: "Diameter = 2 × width × aspect ratio ÷ 25.4 + rim diameter. Most experts recommend staying within about ±3% of the original diameter to keep the speedometer, ABS and transmission behaving correctly. Also check load index, speed rating and clearance.",
    faq: [
      { question: "How much can I change tire size?", answer: "Keep the overall diameter within about 3% of stock and make sure the tires clear the suspension and fenders at full lock." },
      { question: "Will bigger tires affect my speedometer?", answer: "Yes — taller tires make the speedometer read slower than your actual speed, and shorter tires make it read faster." },
    ],
  },
  {
    slug: "tire-life-calculator",
    title: "Tire Life Calculator",
    description: "Estimate how many miles and months your tires have left from tread depth, miles driven so far and your yearly mileage — including the 6-year age limit.",
    metaTitle: "Tire Life Calculator — Miles Left on Tires",
    metaDescription: "Free tire life calculator. Estimate remaining tire miles and months from tread depth, miles driven, yearly mileage and tire age.",
    calcInputs: [
      numberField("newTread", "Tread Depth When New", { unit: "/32 in", default: 10, min: 6, max: 20, step: 0.5 }),
      numberField("currentTread", "Current Tread Depth", { unit: "/32 in", default: 6, max: 20, step: 0.5 }),
      numberField("minimumTread", "Replace At", { unit: "/32 in", default: 3, min: 2, max: 6, step: 0.5 }),
      numberField("milesDriven", "Miles Driven on These Tires", { unit: "miles", default: 24000, max: 200000, step: 500 }),
      numberField("annualMiles", "Miles Driven per Year", { unit: "miles", default: 12000, max: 100000, step: 500 }),
      numberField("tireAgeYears", "Tire Age", { unit: "years", default: 2, max: 15, step: 0.5 }),
    ],
    calcResult: { label: "Remaining Miles", format: "number" },
    calcResults: [
      { key: "remainingMiles", label: "Estimated Miles Left", format: "number", highlight: true },
      { key: "monthsLeft", label: "Months Left (Tread or 6-Year Age, Whichever First)", format: "number" },
      { key: "milesPer32nd", label: "Miles per 1/32 in of Tread", format: "number" },
      { key: "projectedTotalMiles", label: "Projected Total Tire Life (Miles)", format: "number" },
      { key: "treadLeftPercent", label: "Usable Tread Left (%)", format: "percentage" },
    ],
    instructions: "Measure tread depth in several grooves with a gauge (or a penny) and use the lowest reading. Enter the depth when new (often 10–11/32 for all-season tires), when you'll replace them, miles driven so far, yearly miles and the tire age (from the DOT date code).",
    examples: "Example: tires that wore from 10/32 to 6/32 in 24,000 miles have about 18,000 miles left before 3/32 — about 18 months at 12,000 miles a year.",
    assumptions: "Assumes wear continues at the same rate per 1/32 in. Many experts suggest replacing at 3–4/32 for wet traction, and inspecting or replacing tires around 6 years old regardless of tread (10 years at most). Rotations every 5,000–7,500 miles help even out wear.",
    faq: [
      { question: "How long do tires last?", answer: "Most all-season tires last about 40,000–70,000 miles, or roughly 3–6 years for an average driver." },
      { question: "How do I read a tire's age?", answer: "The last four digits of the DOT code show the week and year made — 2223 means the 22nd week of 2023." },
    ],
  },
  {
    slug: "tire-tread-calculator",
    title: "Tire Tread Calculator",
    description: "Check your tire tread depth — convert 32nds of an inch to millimeters and see if it's legal, safe in the rain and good in snow, plus how much longer wet stops get as tread wears.",
    metaTitle: "Tire Tread Calculator — Depth & Safety",
    metaDescription: "Free tire tread calculator. Convert tread depth (32nds to mm), check legal, wet and snow safety and the increase in wet stopping distance.",
    calcInputs: [
      numberField("tread32", "Tread Depth", { unit: "/32 in", default: 4, max: 20, step: 0.5 }),
      numberField("newTread", "Tread Depth When New", { unit: "/32 in", default: 10, min: 6, max: 20, step: 0.5 }),
    ],
    calcResult: { label: "Wet Stopping Increase", format: "percentage" },
    calcResults: [
      { key: "wetStoppingIncrease", label: "Extra Wet Stopping Distance vs New (%)", format: "percentage", highlight: true },
      { key: "treadMm", label: "Tread Depth (mm)", format: "number" },
      { key: "treadInches", label: "Tread Depth (in)", format: "number", decimals: 3 },
      { key: "legalAbove2", label: "Legal (Above 2/32)? (1 = Yes)", format: "number" },
      { key: "wetSafeAbove4", label: "Good in Rain (4/32+)? (1 = Yes)", format: "number" },
      { key: "snowSafeAbove6", label: "Good in Snow (6/32+)? (1 = Yes)", format: "number" },
    ],
    instructions: "Measure tread depth with a gauge in the shallowest groove. The penny test: if you can see all of Lincoln's head, you're at 2/32 or less; the quarter test (Washington's head) checks for 4/32.",
    examples: "Example: at 4/32 in (3.18 mm) your tires are legal but stop roughly 53.64% farther on wet roads than new tires — time to shop for replacements.",
    assumptions: "Most US states set the legal minimum at 2/32 in (1.6 mm in the UK and EU). Wet stopping distance rises sharply as tread wears; the percentage is an approximate curve based on published braking tests, and real results vary by tire, road and speed.",
    faq: [
      { question: "What is the legal tire tread depth?", answer: "2/32 of an inch in most US states and 1.6 mm in the UK and EU." },
      { question: "When should I replace my tires?", answer: "At 4/32 in for good wet traction, 6/32 if you drive in snow, and never below 2/32." },
    ],
  },
  {
    slug: "used-tire-price-calculator",
    title: "Used Tire Price Calculator",
    description: "Find a fair price for used tires from the new price, remaining tread and age — per tire and per set — and compare the cost per usable 32nd of tread with buying new.",
    metaTitle: "Used Tire Price Calculator — Fair Value",
    metaDescription: "Free used tire price calculator. Find a fair price for used tires from new price, tread left and age, and compare value with new.",
    calcInputs: [
      currencyField("newPrice", "New Price per Tire", { default: 180, max: 2000 }),
      numberField("tread32", "Remaining Tread", { unit: "/32 in", default: 7, max: 20, step: 0.5 }),
      numberField("newTread", "Tread Depth When New", { unit: "/32 in", default: 10, min: 6, max: 20, step: 0.5 }),
      numberField("ageYears", "Tire Age", { unit: "years", default: 2, max: 15, step: 0.5 }),
      numberField("count", "Number of Tires", { default: 4, min: 1, max: 8 }),
    ],
    calcResult: { label: "Fair Price per Tire", format: "currency" },
    calcResults: [
      { key: "fairPricePerTire", label: "Fair Price per Tire", format: "currency", highlight: true },
      { key: "priceForSet", label: "Fair Price for All Tires", format: "currency" },
      { key: "percentOfNew", label: "Percent of New Price", format: "percentage" },
      { key: "usableTreadPercent", label: "Usable Tread Remaining (%)", format: "percentage" },
      { key: "costPerUsable32ndUsed", label: "Used: Cost per Usable 1/32", format: "currency" },
      { key: "costPerUsable32ndNew", label: "New: Cost per Usable 1/32", format: "currency" },
    ],
    instructions: "Enter what the same tire costs new, the remaining tread (lowest groove), new tread depth, age from the DOT code and how many tires. If the used cost per 1/32 is close to new, buy new.",
    examples: "Example: a $180 tire with 7/32 left and 2 years old is worth about $80.33 — $321.30 for a set of four.",
    assumptions: "Usable tread is measured down to 2/32. Value drops about 8% per year of age for rubber aging, and a 15% discount reflects unknown history (repairs, impacts). Avoid tires over 6 years old, with plugs near the sidewall, bulges or uneven wear.",
    faq: [
      { question: "Is it worth buying used tires?", answer: "Sometimes — tires with 7/32+ tread, under 4 years old and no repairs can be good value; otherwise new is safer." },
      { question: "How much are used tires worth?", answer: "Usually 25–60% of the new price depending on tread left, age and brand." },
    ],
  },
  {
    slug: "bolt-pattern-calculator",
    title: "Bolt Pattern Calculator",
    description: "Work out a wheel's bolt pattern (PCD) from the number of lugs and the distance between two neighboring studs — and match it to the nearest standard pattern like 5×114.3.",
    metaTitle: "Bolt Pattern Calculator — Find Wheel PCD",
    metaDescription: "Free bolt pattern calculator. Find wheel PCD from lug count and adjacent stud spacing and match the nearest standard like 5×114.3.",
    calcInputs: [
      dropdown("lugs", "Number of Lugs", [["4", 4], ["5", 5], ["6", 6], ["8", 8]], 5),
      numberField("adjacentSpacingMm", "Center-to-Center Distance Between Neighboring Studs", { unit: "mm", default: 67.2, max: 200, step: 0.1 }),
    ],
    calcResult: { label: "Nearest Standard PCD", format: "number" },
    calcResults: [
      { key: "nearestStandardPcdMm", label: "Nearest Standard Bolt Circle (mm)", format: "number", highlight: true },
      { key: "pcdMm", label: "Measured Bolt Circle (mm)", format: "number" },
      { key: "pcdInches", label: "Standard Bolt Circle (in)", format: "number" },
      { key: "differenceMm", label: "Measured − Standard (mm)", format: "number" },
      { key: "lugs", label: "Lugs", format: "number" },
    ],
    instructions: "Count the lugs and measure center to center between two neighboring studs (easiest on 5-lug wheels, where measuring across is tricky). The bolt pattern is written as lugs × PCD, such as 5×114.3.",
    examples: "Example: 5 lugs with 67.2 mm between neighboring studs gives a 114.33 mm circle — standard 114.3 mm (5×4.5 in).",
    assumptions: "PCD = adjacent spacing ÷ sin(180° ÷ lugs). Standard patterns include 4×100, 5×100, 5×108, 5×112, 5×114.3, 5×120, 5×127, 6×135, 6×139.7, 8×165.1 and 8×170. Very close patterns (5×112 vs 5×114.3) are not interchangeable without adapters — confirm with your vehicle's specs.",
    faq: [
      { question: "How do I measure a 5-lug bolt pattern?", answer: "Measure from the center of one stud to the back edge of the stud across from it, or use neighbor-to-neighbor spacing with this calculator." },
      { question: "Is 5×114.3 the same as 5×4.5?", answer: "Yes — 114.3 mm equals 4.5 inches, so they're the same pattern." },
    ],
  },
  {
    slug: "hub-centric-ring-size-calculator",
    title: "Hub Centric Ring Size Calculator",
    description: "Find the hub centric ring size you need — outer diameter to match the wheel's center bore and inner diameter to match your car's hub — and check the gap.",
    metaTitle: "Hub Centric Ring Size Calculator",
    metaDescription: "Free hub centric ring size calculator. Find the ring OD and ID from wheel center bore and vehicle hub bore, and check fitment.",
    calcInputs: [
      numberField("wheelBoreMm", "Wheel Center Bore", { unit: "mm", default: 73.1, max: 200, step: 0.1 }),
      numberField("hubBoreMm", "Vehicle Hub Diameter", { unit: "mm", default: 66.1, max: 200, step: 0.1 }),
    ],
    calcResult: { label: "Ring Size", format: "number" },
    calcResults: [
      { key: "ringOuterMm", label: "Ring Outer Diameter (mm)", format: "number", highlight: true },
      { key: "ringInnerMm", label: "Ring Inner Diameter (mm)", format: "number" },
      { key: "gapMm", label: "Gap Being Filled (mm)", format: "number" },
      { key: "ringNeeded", label: "Ring Needed? (1 = Yes)", format: "number" },
      { key: "wheelWontFit", label: "Wheel Bore Too Small? (1 = Won't Fit)", format: "number" },
    ],
    instructions: "Find the wheel's center bore (stamped on the back of many aftermarket wheels or in its specs) and your vehicle's hub diameter (in the owner's specs or measured with calipers).",
    examples: "Example: a 73.1 mm wheel bore on a 66.1 mm hub needs a 73.1 × 66.1 mm ring to fill the 7 mm gap.",
    assumptions: "Hub centric rings center the wheel on the hub so the lugs don't carry all the load, reducing vibration. Rings are sized OD × ID. Aluminum rings handle heat better; plastic rings are fine for most street cars. If the wheel bore is smaller than the hub, it must be machined or won't fit.",
    faq: [
      { question: "Do I need hub centric rings?", answer: "If your aftermarket wheels' center bore is larger than your hub, rings help prevent vibration and make mounting easier." },
      { question: "Plastic or aluminum hub rings?", answer: "Both work for daily driving; aluminum handles high heat (track use, heavy braking) better." },
    ],
  },
  {
    slug: "towing-capacity-calculator",
    title: "Towing Capacity Calculator",
    description: "Find the heaviest trailer you can safely tow — limited by your vehicle's tow rating, GCWR and payload (via tongue weight) — and check whether your trailer is within limits.",
    metaTitle: "Towing Capacity Calculator — Safe Trailer Weight",
    metaDescription: "Free towing capacity calculator. Find your safe max trailer weight from tow rating, GCWR, GVWR and tongue weight, and check your load.",
    calcInputs: [
      numberField("ratedTowing", "Manufacturer Tow Rating", { unit: "lb", default: 7500, max: 40000, step: 100 }),
      numberField("gcwr", "GCWR (Gross Combined Weight Rating)", { unit: "lb", default: 13000, max: 50000, step: 100 }),
      numberField("gvwr", "GVWR (Gross Vehicle Weight Rating)", { unit: "lb", default: 6800, max: 20000, step: 50 }),
      numberField("curbWeight", "Vehicle Curb Weight", { unit: "lb", default: 4800, max: 20000, step: 50 }),
      numberField("cargoWeight", "Passengers + Cargo in Vehicle", { unit: "lb", default: 600, max: 5000, step: 10 }),
      numberField("trailerWeight", "Loaded Trailer Weight", { unit: "lb", default: 6000, max: 40000, step: 50 }),
      percentField("tonguePercent", "Tongue Weight (% of Trailer)", { default: 12, min: 5, max: 25 }),
    ],
    calcResult: { label: "Max Safe Trailer", format: "number" },
    calcResults: [
      { key: "maxSafeTrailer", label: "Max Safe Trailer Weight (lb)", format: "number", highlight: true },
      { key: "tongueWeight", label: "Tongue Weight (lb)", format: "number" },
      { key: "payloadRemaining", label: "Payload Remaining With Trailer (lb)", format: "number" },
      { key: "gcwrMargin", label: "GCWR Margin (lb)", format: "number" },
      { key: "percentOfTowRating", label: "Trailer as % of Tow Rating", format: "percentage" },
      { key: "withinLimits", label: "Within All Limits? (1 = Yes)", format: "number" },
    ],
    instructions: "Find the tow rating, GCWR and GVWR in your owner's manual or the door-jamb sticker, and weigh your vehicle and loaded trailer if possible (CAT scales are cheap). Use 10–15% tongue weight for conventional trailers and 15–25% for fifth wheels.",
    examples: "Example: a truck rated to tow 7,500 lb with a 13,000 lb GCWR, 4,800 lb curb weight and 600 lb of passengers and gear can safely tow about 7,500 lb; a 6,000 lb trailer leaves 680 lb of payload.",
    assumptions: "Max trailer = the lowest of the tow rating, GCWR − loaded vehicle weight, and payload left ÷ tongue-weight share. Many experts suggest staying at or below 80% of the tow rating for safety margin. Hitches, tires and axle ratings can be lower limits.",
    faq: [
      { question: "How do I calculate how much I can tow?", answer: "Subtract your loaded vehicle weight from the GCWR, then check that the trailer's tongue weight doesn't push you over payload and stay under the tow rating." },
      { question: "What is tongue weight?", answer: "The downward force the trailer puts on the hitch — usually 10–15% of trailer weight — which counts against your vehicle's payload." },
    ],
  },
  {
    slug: "payload-calculator",
    title: "Payload Calculator",
    description: "Calculate how much payload your truck, SUV or van can carry — GVWR minus curb weight — and how much is left after passengers, cargo, accessories and trailer tongue weight.",
    metaTitle: "Payload Calculator — Truck Payload Capacity",
    metaDescription: "Free payload calculator. Find payload capacity from GVWR and curb weight and what's left after passengers, cargo and tongue weight.",
    calcInputs: [
      numberField("gvwr", "GVWR (Door-Jamb Sticker)", { unit: "lb", default: 7000, max: 30000, step: 50 }),
      numberField("curbWeight", "Curb Weight", { unit: "lb", default: 5200, max: 30000, step: 50 }),
      numberField("passengers", "Passengers (Including Driver)", { default: 4, max: 15 }),
      numberField("avgPassengerWeight", "Average Passenger Weight", { unit: "lb", default: 180, max: 400, step: 5 }),
      numberField("cargoWeight", "Cargo", { unit: "lb", default: 300, max: 10000, step: 10 }),
      numberField("accessoriesWeight", "Added Accessories (Bed Cover, Racks, Toolbox)", { unit: "lb", default: 100, max: 3000, step: 10, required: false }),
      numberField("tongueWeight", "Trailer Tongue / Pin Weight", { unit: "lb", default: 0, max: 5000, step: 10, required: false }),
    ],
    calcResult: { label: "Payload Remaining", format: "number" },
    calcResults: [
      { key: "payloadRemaining", label: "Payload Remaining (lb)", format: "number", highlight: true },
      { key: "payloadCapacity", label: "Payload Capacity (lb)", format: "number" },
      { key: "payloadUsed", label: "Payload Used (lb)", format: "number" },
      { key: "percentUsed", label: "Payload Used (%)", format: "percentage" },
      { key: "overloaded", label: "Overloaded? (1 = Yes)", format: "number" },
    ],
    instructions: "Use the GVWR from the door-jamb sticker and the actual curb weight (the yellow 'combined weight of occupants and cargo should never exceed' sticker shows payload directly). Add passengers, cargo, accessories and trailer tongue weight.",
    examples: "Example: a truck with a 7,000 lb GVWR and 5,200 lb curb weight has 1,800 lb of payload; four adults, 300 lb of cargo and 100 lb of accessories leave 680 lb.",
    assumptions: "Payload = GVWR − curb weight. Everything you add counts: people, pets, gear, aftermarket accessories, fuel above the curb-weight level and trailer tongue weight. Exceeding payload strains brakes, suspension and tires and may void warranties.",
    faq: [
      { question: "What is payload capacity?", answer: "The total weight of passengers, cargo, accessories and tongue weight a vehicle can carry — GVWR minus curb weight." },
      { question: "Does tongue weight count against payload?", answer: "Yes — the trailer's tongue or pin weight is carried by the truck and counts as payload." },
    ],
  },
  {
    slug: "car-paint-cost-calculator",
    title: "Car Paint Cost Calculator",
    description: "Estimate what it costs to repaint a car — budget, quality or showroom paint jobs — by vehicle size, color change and bodywork, with a price range.",
    metaTitle: "Car Paint Cost Calculator — Repaint Price",
    metaDescription: "Free car paint cost calculator. Estimate a full repaint by vehicle size, paint quality, color change and bodywork, with a price range.",
    calcInputs: [
      dropdown("vehicleSize", "Vehicle Size", [["Compact car", 0.9], ["Midsize sedan", 1], ["SUV / pickup", 1.3], ["Full-size van / large truck", 1.5]], 1),
      dropdown("quality", "Paint Job", [["Budget (single-stage enamel)", 0], ["Quality (base coat + clear coat)", 1], ["Showroom / custom", 2]], 1),
      dropdown("colorChange", "Color Change (Door Jambs, Engine Bay)", [["Same color", 0], ["Different color", 1]], 0),
      numberField("bodyworkHours", "Bodywork / Rust Repair Hours", { unit: "hours", default: 4, max: 200, step: 0.5, required: false }),
      currencyField("laborRate", "Body Shop Labor Rate", { default: 90, max: 250 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Repaint Cost", format: "currency", highlight: true },
      { key: "paintJob", label: "Paint Job", format: "currency" },
      { key: "bodywork", label: "Bodywork", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Choose the vehicle size and paint quality, whether you're changing color, and estimate bodywork hours for dents, rust and prep beyond a normal scuff-and-shoot.",
    examples: "Example: a quality base/clear repaint on a midsize sedan with 4 hours of bodywork costs about $3,860.00 (range $3,088.00–$5,018.00).",
    assumptions: "Typical 2026 prices for a midsize car: budget repaints about $700–$1,500, quality base/clear $2,500–$5,000 and showroom $7,500–$20,000+. Color changes add about 35% for jambs and engine bay. A vinyl wrap ($2,500–$6,000) is an alternative.",
    faq: [
      { question: "How much does it cost to paint a car?", answer: "Roughly $1,000 for a budget job, $3,000–$5,000 for a quality repaint and $10,000+ for show-level work." },
      { question: "Is it cheaper to wrap or paint a car?", answer: "A quality wrap often costs less than a quality repaint and is reversible, but lasts about 5–7 years." },
    ],
  },
  {
    slug: "car-window-tint-cost-calculator",
    title: "Car Window Tint Cost Calculator",
    description: "Estimate window tint cost by number of windows and film type — dyed, carbon, ceramic or IR ceramic — with windshield strip, full windshield and old tint removal.",
    metaTitle: "Car Window Tint Cost Calculator — Film Prices",
    metaDescription: "Free window tint cost calculator. Estimate car tint cost by windows and film type, with windshield options and old tint removal.",
    calcInputs: [
      numberField("windows", "Side and Rear Windows to Tint", { default: 5, min: 1, max: 12 }),
      dropdown("film", "Film Type", [["Dyed", 35], ["Carbon", 50], ["Ceramic", 80], ["IR / premium ceramic", 110]], 80),
      dropdown("windshieldStrip", "Windshield Sun Strip", [["No", 0], ["Yes", 1]], 0),
      dropdown("fullWindshield", "Full Windshield (Clear Heat-Rejection Film)", [["No", 0], ["Yes", 1]], 0),
      numberField("removalWindows", "Windows With Old Tint to Remove", { default: 0, max: 12, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Tint Cost", format: "currency", highlight: true },
      { key: "sideAndRearWindows", label: "Side & Rear Windows", format: "currency" },
      { key: "windshieldWork", label: "Windshield Work", format: "currency" },
      { key: "oldTintRemoval", label: "Old Tint Removal", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Count the windows to tint (a sedan is usually 4 sides + rear = 5; SUVs often 7), pick the film, and add windshield options and removal of old, bubbling tint.",
    examples: "Example: tinting 5 windows of a sedan with ceramic film costs about $400.00 (range $320.00–$520.00).",
    assumptions: "Typical 2026 shop prices: dyed about $150–$250 for a sedan, carbon $200–$350, ceramic $350–$600 and IR ceramic $500–$800+. Removal of old tint is about $25–$50 per window. Check your state's legal tint darkness (VLT) for front windows.",
    faq: [
      { question: "Is ceramic tint worth the money?", answer: "For heat rejection and clarity, yes — ceramic blocks much more heat than dyed film without interfering with phone signals." },
      { question: "How dark can I legally tint my windows?", answer: "It depends on your state — front side windows commonly must allow 35–70% of light through; check local VLT laws." },
    ],
  },
  {
    slug: "dent-repair-cost-calculator",
    title: "Dent Repair Cost Calculator",
    description: "Estimate dent repair cost by number and size of dents — paintless dent repair (PDR) when the paint is intact, or conventional body filler and paint when it isn't.",
    metaTitle: "Dent Repair Cost Calculator — PDR vs Body Shop",
    metaDescription: "Free dent repair cost calculator. Estimate paintless dent repair vs body-shop cost by number and size of dents and panel material.",
    calcInputs: [
      numberField("dents", "Number of Dents", { default: 2, min: 1, max: 100 }),
      dropdown("size", "Typical Dent Size", [["Small (under 1 in / dime–quarter)", 0], ["Medium (1–2 in)", 1], ["Large (2–4 in)", 2], ["Very large or creased", 3]], 1),
      dropdown("paintDamaged", "Paint Cracked or Chipped?", [["No — paint intact", 0], ["Yes", 1]], 0),
      dropdown("aluminum", "Panel Material", [["Steel", 0], ["Aluminum (harder to repair)", 1]], 0),
    ],
    calcResult: { label: "Best Price", format: "currency" },
    calcResults: [
      { key: "bestPrice", label: "Estimated Repair Cost", format: "currency", highlight: true },
      { key: "paintlessPrice", label: "Paintless Dent Repair (PDR)", format: "currency" },
      { key: "conventionalPrice", label: "Conventional Body Shop Repair", format: "currency" },
      { key: "pdrPossible", label: "PDR Possible? (1 = Yes)", format: "number" },
      { key: "perAdditionalDent", label: "Each Additional Dent", format: "currency" },
    ],
    instructions: "Count the dents, choose their typical size and whether the paint is cracked (which rules out paintless repair), and the panel material.",
    examples: "Example: two medium dents with intact paint cost about $225.00 with paintless dent repair, versus $675.00 at a body shop.",
    assumptions: "Typical 2026 prices: PDR about $75–$150 for a small dent and $250–$450 for large ones; additional dents on the same visit about half price. Conventional repair includes filler, primer, paint and blending. Hail damage is priced per panel by dent count.",
    faq: [
      { question: "How much does paintless dent repair cost?", answer: "Commonly $75–$150 for a small door ding and $250–$500 for larger dents, with discounts for multiple dents." },
      { question: "When can't paintless dent repair be used?", answer: "When paint is cracked, the dent is on a sharp body line or edge, or the metal is stretched." },
    ],
  },
  {
    slug: "oil-change-cost-calculator",
    title: "Oil Change Cost Calculator",
    description: "Compare oil change costs — conventional, high-mileage, synthetic blend or full synthetic — at a shop versus doing it yourself, per change and per year.",
    metaTitle: "Oil Change Cost Calculator — Shop vs DIY",
    metaDescription: "Free oil change cost calculator. Compare shop and DIY oil change cost per change and per year by oil type, interval and mileage.",
    calcInputs: [
      dropdown("oilType", "Oil Type (Typical Shop Price)", [["Conventional ($45)", 45], ["High-mileage ($65)", 65], ["Synthetic blend ($60)", 60], ["Full synthetic ($85)", 85]], 85),
      numberField("quarts", "Oil Capacity", { unit: "quarts", default: 5, min: 3, max: 15, step: 0.5 }),
      currencyField("conventionalQuartPrice", "DIY Conventional Oil per Quart", { default: 5, max: 30, step: 0.25 }),
      currencyField("syntheticQuartPrice", "DIY Synthetic Oil per Quart", { default: 8, max: 30, step: 0.25 }),
      currencyField("filterPrice", "Oil Filter", { default: 10, max: 50, step: 0.5 }),
      numberField("intervalMiles", "Change Interval", { unit: "miles", default: 7500, min: 1000, max: 20000, step: 500 }),
      numberField("annualMiles", "Miles Driven per Year", { unit: "miles", default: 12000, max: 100000, step: 500 }),
    ],
    calcResult: { label: "Annual Shop Cost", format: "currency" },
    calcResults: [
      { key: "annualShopCost", label: "Yearly Cost at a Shop", format: "currency", highlight: true },
      { key: "shopCostPerChange", label: "Shop Cost per Change", format: "currency" },
      { key: "diyCostPerChange", label: "DIY Cost per Change", format: "currency" },
      { key: "annualDiyCost", label: "Yearly DIY Cost", format: "currency" },
      { key: "annualDiySavings", label: "Yearly Savings Doing It Yourself", format: "currency" },
      { key: "changesPerYear", label: "Oil Changes per Year", format: "number" },
    ],
    instructions: "Choose the oil type your owner's manual calls for, its capacity, DIY prices for oil and filter, your change interval (check the manual — many modern synthetic cars use 7,500–10,000 miles) and yearly miles.",
    examples: "Example: full synthetic changes every 7,500 miles at 12,000 miles a year cost about $136.00 a year at a shop, or $80.00 doing it yourself.",
    assumptions: "Shop prices are typical 2026 quick-lube prices including filter and labor; dealers may charge more and coupons less. DIY excludes tools, a drain pan and proper oil disposal (most auto parts stores recycle used oil free). Full synthetic is assumed for the $75+ options.",
    faq: [
      { question: "How much does an oil change cost?", answer: "About $40–$75 for conventional and $70–$125 for full synthetic at most shops in 2026." },
      { question: "How often should I change synthetic oil?", answer: "Follow your owner's manual — commonly every 7,500–10,000 miles or once a year." },
    ],
  },
  {
    slug: "car-battery-life-calculator",
    title: "Car Battery Life Calculator",
    description: "Estimate how much life your car battery has left from its age, climate and driving habits, and check its state of charge from a resting voltage reading.",
    metaTitle: "Car Battery Life Calculator — Years Left",
    metaDescription: "Free car battery life calculator. Estimate remaining battery life from age, climate and driving, and state of charge from voltage.",
    calcInputs: [
      numberField("ageYears", "Battery Age", { unit: "years", default: 3, max: 15, step: 0.5 }),
      dropdown("climate", "Climate", [["Hot (South, desert)", 3], ["Moderate", 5], ["Cold", 4.5]], 5),
      dropdown("shortTrips", "Mostly Short Trips (Under 20 min)?", [["No", 0], ["Yes", 1]], 0),
      dropdown("batteryType", "Battery Type", [["Standard flooded", 0], ["AGM", 1]], 0),
      numberField("restingVoltage", "Resting Voltage (Engine Off 1+ Hour)", { unit: "V", default: 12.5, max: 14, step: 0.05, required: false }),
      currencyField("batteryPrice", "Replacement Battery Price", { default: 180, max: 1000, required: false }),
    ],
    calcResult: { label: "Remaining Years", format: "number" },
    calcResults: [
      { key: "remainingYears", label: "Estimated Years Left", format: "number", highlight: true },
      { key: "expectedLifeYears", label: "Expected Battery Life (Years)", format: "number" },
      { key: "stateOfCharge", label: "State of Charge From Voltage (%)", format: "percentage" },
      { key: "replaceSoon", label: "Replace Soon? (1 = Yes)", format: "number" },
      { key: "annualCost", label: "Battery Cost per Year of Life", format: "currency" },
    ],
    instructions: "Find the battery's age from the date sticker or code, pick your climate and driving pattern, and measure resting voltage with a multimeter after the car has sat for at least an hour.",
    examples: "Example: a 3-year-old standard battery in a moderate climate has about 2 years left; a 12.5 V reading means it's about 75.00% charged.",
    assumptions: "Typical life: about 3 years in hot climates, 4–5 in cold and around 5 in moderate ones; frequent short trips shorten it about 15% and AGM batteries last about 20% longer. Resting voltage: 12.7 V ≈ full, 12.4 V ≈ 60%, 12.0 V ≈ discharged. A load test at a parts store is the best check.",
    faq: [
      { question: "How long does a car battery last?", answer: "Usually 3–5 years — less in hot climates, where heat speeds up internal corrosion." },
      { question: "What voltage means a car battery is bad?", answer: "Below about 12.4 V at rest means it's undercharged; if it won't hold 12.6 V after charging or fails a load test, replace it." },
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
