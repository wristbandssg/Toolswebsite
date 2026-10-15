// One-time (but safe to re-run) batch setup script: creates 10 heating, cooling and air quality size tools
// from the user's shopping list (Shopping Calculators > Home Improvement Cost & Sizing Calculators).
// See src/lib/calc-engine-shopping-home-hvac.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-home-hvac-calculators.ts
// or
//   npm run db:create-shopping-home-hvac-calculators

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

const CLIMATE: [string, number][] = [["Hot (South Florida, Texas Gulf, Arizona)", 0], ["Warm (Southeast, Southern California)", 1], ["Mixed (Mid-Atlantic, Midwest south)", 2], ["Cool (Northeast, Pacific Northwest, upper Midwest)", 3], ["Cold (Minnesota, Maine, mountains)", 4]];
const INSUL: [string, number][] = [["Poor / older home", 0], ["Average", 1], ["Good / newer home", 2]];
const HVAC_NOTE = "This is a rule-of-thumb estimate. For whole-house systems, an HVAC contractor should do a Manual J load calculation — oversized equipment short-cycles and handles humidity poorly.";

const TOOLS: ToolDef[] = [
  {
    slug: "btu-calculator",
    title: "BTU Calculator",
    description: "Find how many BTUs you need to cool or heat a room — for a window, portable or wall AC unit or a room heater — adjusted for climate, ceiling height, insulation, sun, people and kitchens.",
    metaTitle: "BTU Calculator — Room AC & Heating BTU",
    metaDescription: "Free BTU calculator. Find the cooling and heating BTUs for any room and the right window or portable AC size, adjusted for climate and sun.",
    calcInputs: [
      numberField("roomLength", "Room Length", { unit: "ft", default: 16, max: 100, step: 0.5 }),
      numberField("roomWidth", "Room Width", { unit: "ft", default: 14, max: 100, step: 0.5 }),
      numberField("ceilingHeight", "Ceiling Height", { unit: "ft", default: 8, max: 30, step: 0.5 }),
      dropdown("climate", "Climate", CLIMATE, 2),
      dropdown("insulation", "Insulation", INSUL, 1),
      dropdown("sun", "Sun Exposure", [["Shaded", 0], ["Average", 1], ["Very sunny", 2]], 1),
      numberField("people", "People Usually in the Room", { default: 2, max: 20 }),
      dropdown("kitchen", "Is It a Kitchen?", [["No", 0], ["Yes (+4,000 BTU)", 1]], 0),
    ],
    calcResult: { label: "Cooling BTU", format: "number" },
    calcResults: [
      { key: "coolingBtu", label: "Cooling Needed (BTU/hr)", format: "number", highlight: true },
      { key: "acUnitSize", label: "AC Unit Size to Buy (BTU)", format: "number" },
      { key: "heatingBtu", label: "Heating Needed (BTU/hr)", format: "number" },
      { key: "heaterWatts", label: "Electric Heater Watts", format: "number" },
      { key: "roomSqFt", label: "Room Size (sq ft)", format: "number" },
    ],
    instructions: "Enter the room's size and ceiling height, your climate and insulation, how sunny the room is and how many people use it. Choose Yes for kitchens, which add heat from cooking.",
    examples: "Example: a 16 × 14 ft room in a mixed climate needs about 4,480 BTU of cooling — a 5,000 BTU unit — and 7,840 BTU of heating.",
    assumptions: "Cooling ≈ 16–25 BTU per sq ft by climate (ENERGY STAR's room-AC chart is about 20 BTU/sq ft) plus 600 BTU per person over two and 4,000 for kitchens; shaded rooms −10%, sunny +10%. Heating ≈ 20–50 BTU per sq ft. Ceilings above 8 ft scale the load. " + HVAC_NOTE,
    faq: [
      { question: "How many BTUs do I need for my room?", answer: "Roughly 20–30 BTU per square foot for cooling — a 300 sq ft room needs about 6,000–9,000 BTU — more for sunny rooms and kitchens." },
      { question: "Is a bigger air conditioner better?", answer: "No — an oversized unit cools quickly but switches off before removing humidity, leaving the room clammy." },
    ],
  },
  {
    slug: "ac-size-calculator",
    title: "AC Size Calculator",
    description: "Estimate what size central air conditioner (in tons) your home needs from its square footage, climate, ceiling height, insulation and household size.",
    metaTitle: "AC Size Calculator — Central Air Tonnage",
    metaDescription: "Free AC size calculator. Estimate central air conditioner tons for your home's square footage, climate, insulation and ceiling height.",
    calcInputs: [
      numberField("homeSqFt", "Conditioned Floor Area", { unit: "sq ft", default: 2000, max: 20000, step: 50 }),
      dropdown("climate", "Climate", CLIMATE, 1),
      numberField("ceilingHeight", "Average Ceiling Height", { unit: "ft", default: 8, max: 20, step: 0.5 }),
      dropdown("insulation", "Insulation & Windows", INSUL, 1),
      numberField("people", "People in the Home", { default: 4, max: 20 }),
    ],
    calcResult: { label: "AC Tons", format: "number" },
    calcResults: [
      { key: "tons", label: "Central AC Size (Tons)", format: "number", highlight: true },
      { key: "coolingBtu", label: "Cooling Load (BTU/hr)", format: "number" },
      { key: "sqFtPerTon", label: "Square Feet per Ton", format: "number" },
      { key: "multipleSystemsNeeded", label: "Needs More Than One System? (1 = Yes)", format: "number" },
    ],
    instructions: "Enter the floor area you cool, your climate, ceiling height, insulation level and household size. One ton equals 12,000 BTU per hour.",
    examples: "Example: a 2,000 sq ft home in a warm climate needs about 44,000 BTU/hr — a 4-ton system, about 500 sq ft per ton.",
    assumptions: "Load ≈ 16–25 BTU per sq ft by climate, adjusted for ceilings and insulation, plus 600 BTU per extra occupant. Residential systems top out at 5 tons; bigger homes use two systems or zones. " + HVAC_NOTE,
    faq: [
      { question: "What size AC do I need for a 2,000 sq ft house?", answer: "Usually 3.5–4.5 tons depending on climate, insulation and sun — a Manual J calculation gives the exact figure." },
      { question: "How many square feet does a ton of AC cool?", answer: "Typically 400–600 square feet, fewer in hot climates and more in well-insulated homes." },
    ],
  },
  {
    slug: "mini-split-size-calculator",
    title: "Mini Split Size Calculator",
    description: "Size a ductless mini-split system — the indoor head for each of up to four zones and the multi-zone outdoor unit that runs them — for heating and cooling.",
    metaTitle: "Mini Split Size Calculator — BTU per Zone",
    metaDescription: "Free mini split size calculator. Find the BTU size for each indoor head and the multi-zone outdoor unit for up to four rooms.",
    calcInputs: [
      numberField("zone1", "Zone 1 Area", { unit: "sq ft", default: 400, max: 2000, step: 10 }),
      numberField("zone2", "Zone 2 Area", { unit: "sq ft", default: 200, max: 2000, step: 10, required: false }),
      numberField("zone3", "Zone 3 Area", { unit: "sq ft", default: 150, max: 2000, step: 10, required: false }),
      numberField("zone4", "Zone 4 Area", { unit: "sq ft", default: 0, max: 2000, step: 10, required: false }),
      dropdown("climate", "Climate", CLIMATE, 2),
      numberField("ceilingHeight", "Ceiling Height", { unit: "ft", default: 8, max: 20, step: 0.5 }),
      dropdown("insulation", "Insulation", INSUL, 1),
    ],
    calcResult: { label: "Outdoor Unit", format: "number" },
    calcResults: [
      { key: "outdoorUnitBtu", label: "Outdoor Unit Size (BTU)", format: "number", highlight: true },
      { key: "totalIndoorBtu", label: "Total of Indoor Heads (BTU)", format: "number" },
      { key: "zone1Head", label: "Zone 1 Head (BTU)", format: "number" },
      { key: "zone2Head", label: "Zone 2 Head (BTU)", format: "number" },
      { key: "zone3Head", label: "Zone 3 Head (BTU)", format: "number" },
      { key: "zone4Head", label: "Zone 4 Head (BTU)", format: "number" },
    ],
    instructions: "Enter the area of each room or zone that gets its own indoor unit (leave unused zones at 0), plus your climate, ceiling height and insulation.",
    examples: "Example: zones of 400, 200 and 150 sq ft in a mixed climate need 9,000, 6,000 and 6,000 BTU heads on a 24,000 BTU outdoor unit.",
    assumptions: "Each zone is sized for the larger of its cooling load and about 60% of its heating load and rounded to standard heads (6k, 9k, 12k, 15k, 18k, 24k). Multi-zone outdoor units can usually run indoor heads totalling up to about 130% of their rating. Cold-climate models hold capacity below 0°F. " + HVAC_NOTE,
    faq: [
      { question: "What size mini split for a 400 sq ft room?", answer: "Usually a 9,000–12,000 BTU head, depending on climate, sun and insulation." },
      { question: "Can one outdoor unit run several rooms?", answer: "Yes — multi-zone outdoor units connect two to eight indoor heads, sized together." },
    ],
  },
  {
    slug: "heat-pump-size-calculator",
    title: "Heat Pump Size Calculator",
    description: "Estimate the heat pump size in tons for your home — from cooling and heating loads by climate — and the backup heat a standard model may need in winter.",
    metaTitle: "Heat Pump Size Calculator — Tons & Backup Heat",
    metaDescription: "Free heat pump size calculator. Estimate heat pump tonnage from your home's heating and cooling loads, and the backup heat needed.",
    calcInputs: [
      numberField("homeSqFt", "Conditioned Floor Area", { unit: "sq ft", default: 1800, max: 20000, step: 50 }),
      dropdown("climate", "Climate", CLIMATE, 3),
      numberField("ceilingHeight", "Average Ceiling Height", { unit: "ft", default: 8, max: 20, step: 0.5 }),
      dropdown("insulation", "Insulation", INSUL, 1),
      dropdown("coldClimateModel", "Heat Pump Type", [["Standard (sized for cooling)", 0], ["Cold-climate model (sized for heating)", 1]], 1),
    ],
    calcResult: { label: "Heat Pump Tons", format: "number" },
    calcResults: [
      { key: "heatPumpTons", label: "Heat Pump Size (Tons)", format: "number", highlight: true },
      { key: "coolingLoadBtu", label: "Cooling Load (BTU/hr)", format: "number" },
      { key: "heatingLoadBtu", label: "Heating Load (BTU/hr)", format: "number" },
      { key: "backupHeatKw", label: "Backup / Auxiliary Heat (kW, Approx.)", format: "number" },
    ],
    instructions: "Enter the floor area, climate, ceiling height and insulation, and whether you're considering a cold-climate heat pump, which can be sized closer to the heating load.",
    examples: "Example: an 1,800 sq ft home in a cool climate has a heating load of about 75,600 BTU/hr; a cold-climate model of about 4.5 tons fits, with roughly 13 kW of backup heat for the coldest days.",
    assumptions: "Cooling ≈ 16–25 and heating ≈ 20–50 BTU per sq ft by climate. Standard heat pumps are sized to cooling and need resistance or furnace backup in cold weather; cold-climate models are sized to about 70% of the heating load. " + HVAC_NOTE,
    faq: [
      { question: "What size heat pump do I need?", answer: "Often 2–4 tons for a typical home; in cold climates size closer to the heating load with a cold-climate model." },
      { question: "Do heat pumps work in cold weather?", answer: "Modern cold-climate heat pumps keep heating well below 0°F, though their capacity drops as it gets colder." },
    ],
  },
  {
    slug: "furnace-size-calculator",
    title: "Furnace Size Calculator",
    description: "Find the furnace size (input BTUs) for your home from its square footage, climate, insulation and the furnace's efficiency (AFUE).",
    metaTitle: "Furnace Size Calculator — BTU by Square Feet",
    metaDescription: "Free furnace size calculator. Find the furnace BTU input you need from square footage, climate zone, insulation and AFUE efficiency.",
    calcInputs: [
      numberField("homeSqFt", "Heated Floor Area", { unit: "sq ft", default: 2000, max: 20000, step: 50 }),
      dropdown("climate", "Climate", CLIMATE, 3),
      numberField("ceilingHeight", "Average Ceiling Height", { unit: "ft", default: 8, max: 20, step: 0.5 }),
      dropdown("insulation", "Insulation", INSUL, 1),
      percentField("afue", "Furnace Efficiency (AFUE)", { default: 95, min: 50, max: 99, step: 1 }),
    ],
    calcResult: { label: "Furnace Input BTU", format: "number" },
    calcResults: [
      { key: "furnaceInputBtu", label: "Furnace Size (Input BTU)", format: "number", highlight: true },
      { key: "heatingOutputNeeded", label: "Heat Output Needed (BTU/hr)", format: "number" },
      { key: "exactInputBtu", label: "Exact Input Needed (BTU/hr)", format: "number" },
      { key: "btuPerSqFt", label: "Output per Sq Ft (BTU)", format: "number" },
    ],
    instructions: "Enter the heated floor area, your climate, ceiling height, insulation and the AFUE of the furnace you're considering. Furnaces are sold by input BTUs; output = input × AFUE.",
    examples: "Example: a 2,000 sq ft home in a cool climate needs about 84,000 BTU/hr of heat; at 95% AFUE that's 88,421 BTU input — a 100,000 BTU furnace.",
    assumptions: "Heat output ≈ 20–50 BTU per sq ft by climate, adjusted for ceilings and insulation. Input = output ÷ AFUE. Many existing furnaces are oversized; a Manual J often supports a smaller, two-stage or modulating unit. " + HVAC_NOTE,
    faq: [
      { question: "What size furnace for a 2,000 sq ft house?", answer: "Commonly 60,000–100,000 BTU input depending on climate and insulation." },
      { question: "What does AFUE mean?", answer: "Annual fuel utilization efficiency — the share of fuel that becomes heat. A 95% AFUE furnace turns 95% of its input into heat." },
    ],
  },
  {
    slug: "space-heater-size-calculator",
    title: "Space Heater Size Calculator",
    description: "Find the space heater wattage a room needs — about 10 watts per square foot, adjusted for ceiling height, insulation and how cold it is — and what it costs to run per hour.",
    metaTitle: "Space Heater Size Calculator — Watts for a Room",
    metaDescription: "Free space heater size calculator. Find the watts a room needs, how many 1,500 W heaters, BTUs and the hourly running cost.",
    calcInputs: [
      numberField("roomLength", "Room Length", { unit: "ft", default: 14, max: 60, step: 0.5 }),
      numberField("roomWidth", "Room Width", { unit: "ft", default: 12, max: 60, step: 0.5 }),
      numberField("ceilingHeight", "Ceiling Height", { unit: "ft", default: 8, max: 20, step: 0.5 }),
      dropdown("insulation", "Insulation", INSUL, 1),
      dropdown("coldness", "How Cold", [["Just taking the chill off", 0], ["Main heat on cool days", 1], ["Very cold room / garage", 2]], 1),
      currencyField("pricePerKwh", "Electricity Price per kWh", { default: 0.17, max: 2, step: 0.01, required: false }),
    ],
    calcResult: { label: "Watts Needed", format: "number" },
    calcResults: [
      { key: "wattsNeeded", label: "Heater Watts Needed", format: "number", highlight: true },
      { key: "heaters1500w", label: "1,500 W Heaters Needed", format: "number" },
      { key: "btuPerHour", label: "BTU per Hour", format: "number" },
      { key: "costPerHour", label: "Running Cost per Hour", format: "currency" },
    ],
    instructions: "Enter the room size, ceiling height, insulation, how much heat you need and your electricity price. Most plug-in heaters are limited to 1,500 W.",
    examples: "Example: a 14 × 12 ft room needs about 1,680 W — 2 heaters of 1,500 W, or one to take the chill off — costing about $0.29 an hour at full power.",
    assumptions: "Rule of thumb: 10 W per sq ft for an 8 ft ceiling with average insulation. A 1,500 W heater gives 5,118 BTU/hr. Never run space heaters on extension cords or leave them unattended. All electric heaters are about 100% efficient; heat pumps are cheaper to run.",
    faq: [
      { question: "What size space heater do I need?", answer: "About 10 watts per square foot — a 150 sq ft room needs a 1,500 W heater." },
      { question: "How much does a space heater cost to run?", answer: "A 1,500 W heater uses 1.5 kWh an hour — about 25 cents at 17 cents per kWh." },
    ],
  },
  {
    slug: "wood-stove-size-calculator",
    title: "Wood Stove Size Calculator",
    description: "Find the wood stove size for the area you want to heat — BTU output, firebox volume and stove size class — and roughly how much firewood a season takes.",
    metaTitle: "Wood Stove Size Calculator — BTU & Firebox",
    metaDescription: "Free wood stove size calculator. Find the BTU output and firebox size for the area you heat, plus cords of firewood per season.",
    calcInputs: [
      numberField("areaSqFt", "Area to Heat", { unit: "sq ft", default: 1500, max: 5000, step: 50 }),
      dropdown("climate", "Climate", CLIMATE, 3),
      dropdown("insulation", "Insulation", INSUL, 1),
    ],
    calcResult: { label: "Stove BTU Output", format: "number" },
    calcResults: [
      { key: "stoveBtuOutput", label: "Stove Heat Output (BTU/hr)", format: "number", highlight: true },
      { key: "fireboxCubicFeet", label: "Firebox Size (cu ft)", format: "number" },
      { key: "sizeCode", label: "Stove Size (1 Small, 2 Medium, 3 Large)", format: "number" },
      { key: "cordsPerSeason", label: "Firewood per Season (Cords, Approx.)", format: "number" },
    ],
    instructions: "Enter the area the stove should heat (open-plan space it can reach), your climate and insulation.",
    examples: "Example: heating 1,500 sq ft in a cool climate takes about 52,500 BTU/hr — a stove with about a 2.1 cu ft firebox (size code 2) — and around 6 cords of hardwood a season as primary heat.",
    assumptions: "Output ≈ 20–40 BTU per sq ft by climate. Firebox ≈ 1 cu ft per 25,000 BTU/hr. Stove makers' 'heats up to' figures are optimistic; open layouts heat better than closed rooms. Firewood estimate assumes seasoned hardwood at about 20 million BTU per cord and 70% efficiency.",
    faq: [
      { question: "What size wood stove do I need?", answer: "Small stoves (under 1.5 cu ft) suit up to about 1,000 sq ft, medium (1.5–2.5 cu ft) 1,000–2,000 sq ft, and large stoves bigger areas." },
      { question: "How much firewood will I burn in a winter?", answer: "Using a stove as main heat in a cold climate often takes 3–6 cords of seasoned hardwood." },
    ],
  },
  {
    slug: "dehumidifier-size-calculator",
    title: "Dehumidifier Size Calculator",
    description: "Find the dehumidifier capacity you need in pints per day for a basement or room, from its size and how damp it is.",
    metaTitle: "Dehumidifier Size Calculator — Pints per Day",
    metaDescription: "Free dehumidifier size calculator. Find the pints-per-day capacity for a basement or room from its square footage and dampness.",
    calcInputs: [
      numberField("areaSqFt", "Area", { unit: "sq ft", default: 1200, max: 5000, step: 50 }),
      dropdown("condition", "Condition", [["Moderately damp (musty in humid weather)", 0], ["Very damp (always smells musty)", 1], ["Wet (damp spots, sweating walls)", 2], ["Extremely wet (standing water)", 3]], 1),
    ],
    calcResult: { label: "Pints per Day", format: "number" },
    calcResults: [
      { key: "pintsPerDay", label: "Moisture to Remove (Pints/Day)", format: "number", highlight: true },
      { key: "modelSizePints", label: "Dehumidifier Size to Buy (Pints)", format: "number" },
      { key: "tankEmptiesPerDay", label: "Tank Empties per Day (8-Pint Tank)", format: "number" },
    ],
    instructions: "Enter the area of the space and choose how damp it is. In basements, run the dehumidifier with doors closed and aim for 40–50% humidity.",
    examples: "Example: a 1,200 sq ft very damp basement needs about 20 pints a day — a 20-pint dehumidifier.",
    assumptions: "Based on AHAM sizing guidance (pints per day by area and condition), using the 2019 DOE test standard ratings. Standing water needs drainage fixes first. Units with a pump or hose drain save emptying the tank.",
    faq: [
      { question: "What size dehumidifier for a basement?", answer: "Most basements need a 35–50 pint (2019 standard) unit; very large or wet basements need 70+ pints or a whole-house model." },
      { question: "What humidity should a basement be?", answer: "About 40–50% to prevent mold and musty smells." },
    ],
  },
  {
    slug: "humidifier-size-calculator",
    title: "Humidifier Size Calculator",
    description: "Find the humidifier output you need in gallons per day for a room or whole house, from its size and how tightly it's built, plus how often you'll refill.",
    metaTitle: "Humidifier Size Calculator — Gallons per Day",
    metaDescription: "Free humidifier size calculator. Find the gallons-per-day output for a room or house, the humidifier type and daily refills.",
    calcInputs: [
      numberField("areaSqFt", "Area to Humidify", { unit: "sq ft", default: 1000, max: 6000, step: 50 }),
      dropdown("construction", "House Construction", [["Loose / drafty", 0], ["Average", 1], ["Tight / newer", 2]], 1),
      numberField("tankGallons", "Humidifier Tank Size", { unit: "gallons", default: 1.5, max: 10, step: 0.25, required: false }),
    ],
    calcResult: { label: "Gallons per Day", format: "number" },
    calcResults: [
      { key: "gallonsPerDay", label: "Output Needed (Gallons/Day)", format: "number", highlight: true },
      { key: "unitTypeCode", label: "Type (1 Tabletop, 2 Console / Large Room, 3 Whole-House)", format: "number" },
      { key: "refillsPerDay", label: "Refills per Day", format: "number" },
    ],
    instructions: "Enter the area you want to humidify and how airtight the house is. Aim for 30–50% indoor humidity in winter.",
    examples: "Example: 1,000 sq ft in an average house needs about 2 gallons of output a day — a console humidifier, refilled about 1.33 times a day with a 1.5-gallon tank.",
    assumptions: "About 2 gallons per day per 1,000 sq ft for an average house, more for drafty homes and less for tight ones. Too much humidity causes condensation on windows and mold — use a hygrometer.",
    faq: [
      { question: "What size humidifier do I need?", answer: "Roughly 2 gallons a day per 1,000 square feet for an average home in winter." },
      { question: "What humidity is best indoors in winter?", answer: "About 30–50%; lower if windows fog up in very cold weather." },
    ],
  },
  {
    slug: "air-purifier-size-calculator",
    title: "Air Purifier Size Calculator",
    description: "Find the clean air delivery rate (CADR) an air purifier needs for a room — from its volume and the air changes per hour for general use, allergies or smoke.",
    metaTitle: "Air Purifier Size Calculator — CADR for a Room",
    metaDescription: "Free air purifier size calculator. Find the CADR you need from room size, ceiling height and air changes per hour for allergies or smoke.",
    calcInputs: [
      numberField("roomLength", "Room Length", { unit: "ft", default: 15, max: 100, step: 0.5 }),
      numberField("roomWidth", "Room Width", { unit: "ft", default: 12, max: 100, step: 0.5 }),
      numberField("ceilingHeight", "Ceiling Height", { unit: "ft", default: 8, max: 30, step: 0.5 }),
      dropdown("need", "Purpose", [["General air cleaning (3 ACH)", 0], ["Allergies / pets (4 ACH)", 1], ["Smoke or wildfire season (5 ACH)", 2]], 1),
    ],
    calcResult: { label: "CADR Needed", format: "number" },
    calcResults: [
      { key: "cadrNeeded", label: "CADR Needed (CFM)", format: "number", highlight: true },
      { key: "twoThirdsRuleCadr", label: "AHAM Two-Thirds Rule CADR", format: "number" },
      { key: "roomSqFt", label: "Room Area (sq ft)", format: "number" },
      { key: "roomCubicFeet", label: "Room Volume (cu ft)", format: "number" },
      { key: "airChangesPerHour", label: "Air Changes per Hour", format: "number" },
    ],
    instructions: "Enter the room size, ceiling height and what you're cleaning the air for. Compare the result with the smoke CADR on the purifier's AHAM label.",
    examples: "Example: a 15 × 12 ft bedroom with 8 ft ceilings needs a CADR of about 96 for allergies (4 air changes per hour).",
    assumptions: "CADR = volume × air changes per hour ÷ 60. AHAM's simpler rule is a smoke CADR of at least two-thirds of the room area for 8 ft ceilings (about 4.8 ACH). Run purifiers continuously and keep filters fresh.",
    faq: [
      { question: "What CADR do I need for my room?", answer: "At least two-thirds of the room's square footage for 8 ft ceilings — a 200 sq ft room needs a CADR of about 130." },
      { question: "What are air changes per hour?", answer: "How many times the purifier filters the room's full volume of air each hour; 4–5 is good for allergies and smoke." },
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
