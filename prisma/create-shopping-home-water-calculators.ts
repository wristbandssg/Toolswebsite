// One-time (but safe to re-run) batch setup script: creates 13 pool, water system and garage door spring tools
// from the user's shopping list (Shopping Calculators > Home Improvement Cost & Sizing Calculators).
// See src/lib/calc-engine-shopping-home-water.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-home-water-calculators.ts
// or
//   npm run db:create-shopping-home-water-calculators

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

const PRO_NOTE = "This is a planning estimate — a licensed contractor should confirm sizing against local codes and the equipment's specifications.";

const TOOLS: ToolDef[] = [
  {
    slug: "pool-size-calculator",
    title: "Pool Size Calculator",
    description: "Find how many gallons your pool holds — rectangular, round, oval or kidney-shaped — from its size and shallow and deep end depths, plus surface area.",
    metaTitle: "Pool Size Calculator — Gallons in a Pool",
    metaDescription: "Free pool size calculator. Find pool volume in gallons and liters for rectangular, round, oval and kidney pools, plus surface area.",
    calcInputs: [
      dropdown("shape", "Pool Shape", [["Rectangle", 0], ["Round (length = diameter)", 1], ["Oval", 2], ["Kidney", 3]], 0),
      numberField("length", "Length (or Diameter)", { unit: "ft", default: 32, max: 200, step: 0.5 }),
      numberField("width", "Width (Kidney: Widest End)", { unit: "ft", default: 16, max: 100, step: 0.5, required: false }),
      numberField("width2", "Kidney: Narrow End Width", { unit: "ft", default: 0, max: 100, step: 0.5, required: false }),
      numberField("shallowDepth", "Shallow End Depth", { unit: "ft", default: 3.5, max: 20, step: 0.25 }),
      numberField("deepDepth", "Deep End Depth", { unit: "ft", default: 8, max: 20, step: 0.25 }),
    ],
    calcResult: { label: "Gallons", format: "number" },
    calcResults: [
      { key: "gallons", label: "Pool Volume (Gallons)", format: "number", highlight: true },
      { key: "liters", label: "Liters", format: "number" },
      { key: "surfaceAreaSqFt", label: "Surface Area (sq ft)", format: "number" },
      { key: "cubicFeet", label: "Cubic Feet", format: "number" },
      { key: "averageDepthFt", label: "Average Depth (ft)", format: "number" },
    ],
    instructions: "Choose the shape and enter the length and width (diameter for round pools) and the shallow and deep end depths. For above-ground pools, use the water depth, not the wall height.",
    examples: "Example: a 32 × 16 ft rectangular pool from 3.5 to 8 ft deep holds about 22,021 gallons (83,350 liters).",
    assumptions: "Gallons = surface area × average depth × 7.48. Round area = π × radius²; oval = π × half-length × half-width; kidney ≈ 0.45 × (wide + narrow end) × length. Sloped floors with long shallow sections hold a little more than the simple average. Use the volume for chemicals, pumps and heaters.",
    faq: [
      { question: "How do I calculate pool gallons?", answer: "Multiply length × width × average depth in feet by 7.48 for a rectangle; for a round pool use diameter² × depth × 5.9." },
      { question: "How many gallons is a 24 ft round above-ground pool?", answer: "About 13,500 gallons at 52 inches (4.33 ft) of water." },
    ],
  },
  {
    slug: "pool-pump-size-calculator",
    title: "Pool Pump Size Calculator",
    description: "Find the pool pump flow (GPM) to turn your water over in 8 hours and the horsepower needed at typical plumbing resistance.",
    metaTitle: "Pool Pump Size Calculator — GPM & Horsepower",
    metaDescription: "Free pool pump size calculator. Find the GPM flow for your pool's turnover and the pump horsepower needed for your plumbing head.",
    calcInputs: [
      numberField("gallons", "Pool Volume", { unit: "gallons", default: 20000, max: 500000, step: 500 }),
      numberField("turnoverHours", "Turnover Time", { unit: "hours", default: 8, min: 4, max: 12, step: 0.5 }),
      numberField("headFt", "Total Dynamic Head (Plumbing Resistance)", { unit: "ft", default: 50, max: 120, step: 5 }),
    ],
    calcResult: { label: "Minimum GPM", format: "number" },
    calcResults: [
      { key: "minimumGpm", label: "Minimum Flow (GPM)", format: "number", highlight: true },
      { key: "gallonsPerHour", label: "Gallons per Hour", format: "number" },
      { key: "estimatedHp", label: "Estimated Horsepower Needed", format: "number" },
      { key: "pumpHp", label: "Pump Size to Look At (HP)", format: "number" },
      { key: "variableSpeedRecommended", label: "Variable-Speed Pump Recommended? (1 = Yes)", format: "number" },
    ],
    instructions: "Enter the pool volume and the turnover time — how long it takes to filter all the water (8 hours is standard for residential pools). Total dynamic head is the plumbing's resistance; 40–60 ft is typical.",
    examples: "Example: a 20,000 gallon pool turned over in 8 hours needs about 41.67 GPM. At 50 ft of head that's roughly 1.05 HP, so look at a 1.5 HP pump.",
    assumptions: "GPM = gallons ÷ (turnover hours × 60). Water HP = GPM × head ÷ 3,960, divided by about 50% pump efficiency. Oversized pumps waste energy and can exceed the filter's maximum flow. Many states now require variable-speed pumps for replacements. " + PRO_NOTE,
    faq: [
      { question: "What size pump do I need for my pool?", answer: "One that moves the full volume in about 8 hours — a 20,000 gallon pool needs roughly 40–45 GPM — without exceeding your filter's flow rating." },
      { question: "Is a bigger pool pump better?", answer: "No — an oversized pump wastes electricity and can damage the filter. Variable-speed pumps run slower and cost much less to operate." },
    ],
  },
  {
    slug: "pool-filter-size-calculator",
    title: "Pool Filter Size Calculator",
    description: "Find the pool filter size you need — sand, cartridge or DE — in square feet of filter area for your pump's flow rate.",
    metaTitle: "Pool Filter Size Calculator — Sand, Cartridge, DE",
    metaDescription: "Free pool filter size calculator. Find the filter area in square feet for sand, cartridge or DE filters from your pump's flow rate.",
    calcInputs: [
      numberField("gpm", "Pump Flow Rate", { unit: "GPM", default: 45, max: 500, step: 1 }),
      dropdown("filterType", "Filter Type", [["Sand", 0], ["Cartridge", 1], ["DE (diatomaceous earth)", 2]], 1),
      numberField("gallons", "Pool Volume (Optional)", { unit: "gallons", default: 20000, max: 500000, step: 500, required: false }),
    ],
    calcResult: { label: "Filter Area", format: "number" },
    calcResults: [
      { key: "filterAreaSqFt", label: "Recommended Filter Area (sq ft)", format: "number", highlight: true },
      { key: "minimumAreaSqFt", label: "Minimum Filter Area (sq ft)", format: "number" },
      { key: "flowGpm", label: "Flow (GPM)", format: "number" },
      { key: "turnoverHoursAtFlow", label: "Turnover at This Flow (hours)", format: "number" },
    ],
    instructions: "Enter your pump's flow rate (or the GPM from the pump size calculator) and choose the filter type. Sizing up gives longer cleaning intervals.",
    examples: "Example: 45 GPM through a cartridge filter needs at least 120 sq ft of filter area; about 150 sq ft is a comfortable size.",
    assumptions: "Design flow per square foot: sand 20 GPM, cartridge 0.375 GPM, DE 2 GPM (residential standards). Recommended sizes add 10–25% headroom. Check the filter's maximum flow is above your pump's output.",
    faq: [
      { question: "What size filter do I need for my pool?", answer: "Divide your pump's GPM by the filter's design rate: about 20 GPM per sq ft for sand, 2 for DE and 0.375 for cartridge." },
      { question: "Which pool filter is best?", answer: "DE filters clean finest, cartridges save water (no backwashing) and sand is cheapest and simplest." },
    ],
  },
  {
    slug: "pool-heater-size-calculator",
    title: "Pool Heater Size Calculator",
    description: "Find the pool heater size in BTUs — enough to hold your target temperature over the air temperature and to heat the pool up in a set time — for gas heaters and heat pumps.",
    metaTitle: "Pool Heater Size Calculator — BTU Needed",
    metaDescription: "Free pool heater size calculator. Find the BTUs to maintain and heat up your pool, gas heater size and heat pump capacity.",
    calcInputs: [
      numberField("surfaceArea", "Pool Surface Area", { unit: "sq ft", default: 512, max: 10000, step: 10 }),
      numberField("gallons", "Pool Volume", { unit: "gallons", default: 20000, max: 500000, step: 500 }),
      numberField("desiredTemp", "Desired Water Temperature", { unit: "°F", default: 82, max: 104, step: 1 }),
      numberField("airTemp", "Average Air Temperature (Coldest Month of Use)", { unit: "°F", default: 65, max: 100, step: 1 }),
      numberField("waterTemp", "Starting Water Temperature", { unit: "°F", default: 68, max: 100, step: 1 }),
      numberField("heatUpHours", "Time to Heat Up", { unit: "hours", default: 24, max: 168, step: 1 }),
    ],
    calcResult: { label: "BTU Needed", format: "number" },
    calcResults: [
      { key: "btuNeeded", label: "Heater Output Needed (BTU/hr)", format: "number", highlight: true },
      { key: "btuToMaintain", label: "To Maintain Temperature (BTU/hr)", format: "number" },
      { key: "btuToHeatUp", label: "To Heat Up in Time (BTU/hr)", format: "number" },
      { key: "gasHeaterSize", label: "Gas Heater Size (BTU)", format: "number" },
      { key: "heatPumpBtu", label: "Heat Pump Output (BTU/hr)", format: "number" },
    ],
    instructions: "Enter the surface area and volume, the temperature you want, the average air temperature in the coolest month you swim, the starting water temperature and how quickly you want to heat up.",
    examples: "Example: a 512 sq ft, 20,000 gallon pool held at 82°F with 65°F air needs about 104,448 BTU/hr to maintain; heating from 68°F in 24 hours needs 97,300 BTU/hr, so a 150,000 BTU gas heater fits.",
    assumptions: "Maintain ≈ surface area × (water − air temperature) × 12 BTU/hr; heat-up = gallons × 8.34 × temperature rise ÷ hours. A solar cover cuts heat loss by up to half. Heat pumps work best above about 50°F air. " + PRO_NOTE,
    faq: [
      { question: "What size pool heater do I need?", answer: "Multiply surface area by the temperature rise over air and by 12 — a 500 sq ft pool needing a 20°F rise needs about 120,000 BTU/hr." },
      { question: "Gas heater or heat pump?", answer: "Gas heats fastest and works in any weather; heat pumps cost much less to run in warm climates but heat slowly." },
    ],
  },
  {
    slug: "septic-tank-size-calculator",
    title: "Septic Tank Size Calculator",
    description: "Find the septic tank size for your home by bedrooms (with a garbage disposal allowance), the daily wastewater flow and the drain field area for your soil.",
    metaTitle: "Septic Tank Size Calculator — By Bedrooms",
    metaDescription: "Free septic tank size calculator. Find septic tank gallons by bedrooms, daily flow, drain field area by soil type and pumping frequency.",
    calcInputs: [
      numberField("bedrooms", "Bedrooms", { default: 4, min: 1, max: 10 }),
      dropdown("disposal", "Garbage Disposal?", [["No", 0], ["Yes (+50%)", 1]], 0),
      dropdown("soil", "Soil Type", [["Sandy", 0], ["Loam", 1], ["Clay loam", 2], ["Clay", 3]], 1),
    ],
    calcResult: { label: "Tank Size", format: "number" },
    calcResults: [
      { key: "tankGallons", label: "Septic Tank Size (Gallons)", format: "number", highlight: true },
      { key: "dailyFlowGallons", label: "Design Daily Flow (Gallons)", format: "number" },
      { key: "drainFieldSqFt", label: "Drain Field Area (sq ft, Approx.)", format: "number" },
      { key: "pumpEveryYears", label: "Pump About Every (Years)", format: "number" },
    ],
    instructions: "Enter the number of bedrooms (codes use bedrooms rather than people), whether you have a garbage disposal and your soil type. A percolation test determines the real drain field size.",
    examples: "Example: a 4-bedroom home typically needs a 1,250 gallon tank for a 600 gallon daily design flow, and about 750 sq ft of drain field in loam.",
    assumptions: "Common code minimums: 1,000 gallons up to 3 bedrooms, plus 250 gallons per extra bedroom; many codes add 50% with a garbage disposal. Design flow ≈ 150 gallons per bedroom per day. Soil loading rates: sand about 1.2, loam 0.8, clay loam 0.5, clay 0.3 gal/sq ft/day. " + PRO_NOTE,
    faq: [
      { question: "What size septic tank for a 3-bedroom house?", answer: "Usually 1,000 gallons, the minimum in most codes for up to three bedrooms." },
      { question: "How often should a septic tank be pumped?", answer: "Every 3 to 5 years for most households, more often for small tanks or large families." },
    ],
  },
  {
    slug: "well-pump-size-calculator",
    title: "Well Pump Size Calculator",
    description: "Size a well pump — the flow your household needs by bathrooms and irrigation, the total dynamic head from well depth, lift and pressure, and the pump horsepower.",
    metaTitle: "Well Pump Size Calculator — GPM, Head & HP",
    metaDescription: "Free well pump size calculator. Find household GPM, total dynamic head and pump horsepower for a submersible or jet well pump.",
    calcInputs: [
      numberField("bathrooms", "Bathrooms", { default: 2, min: 1, max: 5 }),
      dropdown("irrigation", "Irrigation or Livestock?", [["No", 0], ["Yes (+4 GPM)", 1]], 0),
      numberField("pumpingLevel", "Pumping Water Level (Depth to Water While Pumping)", { unit: "ft", default: 120, max: 1000, step: 5 }),
      numberField("elevation", "Height From Well Head to House", { unit: "ft", default: 10, max: 300, step: 1 }),
      numberField("pressure", "Pressure Switch Cut-Out", { unit: "psi", default: 60, max: 100, step: 5 }),
      numberField("pipeLength", "Pipe Length to the House", { unit: "ft", default: 100, max: 2000, step: 10 }),
    ],
    calcResult: { label: "Pump HP", format: "number" },
    calcResults: [
      { key: "pumpHp", label: "Pump Size (HP)", format: "number", highlight: true },
      { key: "flowGpm", label: "Household Flow (GPM)", format: "number" },
      { key: "totalDynamicHeadFt", label: "Total Dynamic Head (ft)", format: "number" },
      { key: "estimatedHp", label: "Estimated HP Needed", format: "number" },
      { key: "pumpTypeCode", label: "Pump Type (1 Jet Pump, 2 Submersible)", format: "number" },
    ],
    instructions: "Enter the bathrooms (or fixtures), any irrigation, the pumping water level, the rise from the well to the house, the pressure switch setting and the pipe run.",
    examples: "Example: a 2-bathroom home needs about 8 GPM. With water at 120 ft, a 10 ft rise, 60 psi and 100 ft of pipe, total head is 274 ft, so a 1.5 HP submersible pump fits.",
    assumptions: "Demand: about 6 GPM for 1 bathroom, 8 for 2, 10 for 3. Total head = pumping level + elevation + psi × 2.31 + about 5 ft of friction per 100 ft of pipe. Never size the pump above the well's recovery rate. " + PRO_NOTE,
    faq: [
      { question: "What size well pump do I need?", answer: "One that delivers your peak demand (about 8–10 GPM for a typical home) at the total head from water level, lift and pressure — often 1/2 to 1 1/2 HP." },
      { question: "Jet pump or submersible?", answer: "Jet pumps suit shallow wells (water within about 25 ft); deeper wells need submersible pumps." },
    ],
  },
  {
    slug: "pressure-tank-size-calculator",
    title: "Pressure Tank Size Calculator",
    description: "Find the well pressure tank size you need — drawdown for your pump's flow and minimum run time, adjusted for the pressure switch setting.",
    metaTitle: "Pressure Tank Size Calculator — Well Tanks",
    metaDescription: "Free pressure tank size calculator. Find well pressure tank size from pump GPM, minimum run time and pressure switch setting.",
    calcInputs: [
      numberField("pumpGpm", "Pump Flow Rate", { unit: "GPM", default: 10, max: 100, step: 0.5 }),
      numberField("minRunMinutes", "Minimum Pump Run Time", { unit: "minutes", default: 1, min: 1, max: 5, step: 0.5 }),
      dropdown("pressureSetting", "Pressure Switch", [["20/40 psi", 0], ["30/50 psi", 1], ["40/60 psi", 2], ["50/70 psi", 3]], 2),
    ],
    calcResult: { label: "Tank Size", format: "number" },
    calcResults: [
      { key: "tankSizeGallons", label: "Tank Size (Total Gallons)", format: "number", highlight: true },
      { key: "drawdownGallons", label: "Drawdown Needed (Gallons)", format: "number" },
      { key: "drawdownFactor", label: "Drawdown Factor", format: "number" },
      { key: "cyclesPerHourAtFullDemand", label: "Pump Cycles per Hour at Full Demand", format: "number" },
    ],
    instructions: "Enter the pump's flow rate, the minimum run time the pump maker recommends (usually 1–2 minutes) and your pressure switch setting.",
    examples: "Example: a 10 GPM pump with a 1-minute minimum run time on a 40/60 switch needs 10 gallons of drawdown — a 40 gallon tank.",
    assumptions: "Drawdown = GPM × minimum run time; tank size = drawdown ÷ drawdown factor (about 0.32 at 20/40, 0.28 at 30/50, 0.25 at 40/60 psi). Set the tank's air pre-charge 2 psi below the cut-in pressure. Bigger tanks mean fewer pump starts and longer pump life. " + PRO_NOTE,
    faq: [
      { question: "What size pressure tank do I need?", answer: "Enough drawdown for the pump to run at least a minute: a 10 GPM pump needs 10 gallons of drawdown, about a 40-gallon tank at 40/60 psi." },
      { question: "What is drawdown?", answer: "The water a pressure tank delivers between the pump shutting off and turning back on." },
    ],
  },
  {
    slug: "expansion-tank-size-calculator",
    title: "Expansion Tank Size Calculator",
    description: "Size a thermal expansion tank for a water heater — how much the water expands when heated and the tank size for your supply pressure.",
    metaTitle: "Expansion Tank Size Calculator — Water Heaters",
    metaDescription: "Free expansion tank size calculator. Find thermal expansion volume and the expansion tank size for your water heater and supply pressure.",
    calcInputs: [
      numberField("heaterGallons", "Water Heater Size", { unit: "gallons", default: 50, max: 200, step: 5 }),
      numberField("supplyPressure", "Incoming Water Pressure", { unit: "psi", default: 60, max: 150, step: 1 }),
      numberField("coldTemp", "Incoming Water Temperature", { unit: "°F", default: 50, max: 80, step: 1 }),
      numberField("hotTemp", "Water Heater Setting", { unit: "°F", default: 120, max: 160, step: 1 }),
      numberField("maxPressure", "Maximum Allowed Pressure", { unit: "psi", default: 80, max: 150, step: 5 }),
    ],
    calcResult: { label: "Tank Size", format: "number" },
    calcResults: [
      { key: "tankSizeGallons", label: "Minimum Tank Size (Gallons)", format: "number", highlight: true },
      { key: "standardTankGallons", label: "Standard Tank to Buy (Gallons)", format: "number" },
      { key: "expansionGallons", label: "Thermal Expansion (Gallons)", format: "number" },
      { key: "precharge", label: "Set Pre-Charge To (psi)", format: "number" },
    ],
    instructions: "Enter the water heater size, your incoming water pressure (check with a gauge on a hose bib), the incoming and heater temperatures and the maximum pressure you want to allow (80 psi is the plumbing code limit for fixtures).",
    examples: "Example: a 50 gallon heater at 120°F with 50°F supply water expands by 0.55 gallons. At 60 psi supply and an 80 psi limit, the tank must be at least 2.59 gallons — buy a 4.5 gallon tank.",
    assumptions: "Expansion = heater gallons × (density of cold water ÷ density of hot water − 1). Tank size = expansion × max absolute pressure ÷ (max − supply absolute pressure). Set the pre-charge to the supply pressure. High supply pressure needs a much bigger tank — or a pressure-reducing valve. " + PRO_NOTE,
    faq: [
      { question: "Do I need an expansion tank on my water heater?", answer: "Usually yes if you have a closed system (a check valve or pressure-reducing valve), and many codes now require one." },
      { question: "What size expansion tank for a 50 gallon water heater?", answer: "Typically a 2-gallon tank at 40–50 psi supply pressure; at 60 psi or more you need a 4.5-gallon tank or a pressure-reducing valve." },
    ],
  },
  {
    slug: "sump-pump-size-calculator",
    title: "Sump Pump Size Calculator",
    description: "Size a sump pump from how fast water fills your pit — inflow in gallons per hour, total head from lift and pipe run, and the pump capacity and horsepower to choose.",
    metaTitle: "Sump Pump Size Calculator — GPH & Horsepower",
    metaDescription: "Free sump pump size calculator. Measure your pit's inflow, find total head and the pump GPH and horsepower you need.",
    calcInputs: [
      numberField("pitDiameter", "Sump Pit Diameter", { unit: "in", default: 18, max: 48, step: 1 }),
      numberField("riseInches", "Water Rise Measured", { unit: "in", default: 5, max: 48, step: 0.5 }),
      numberField("riseMinutes", "Over This Many Minutes", { unit: "minutes", default: 1, max: 60, step: 0.5 }),
      numberField("verticalLift", "Vertical Lift (Pump to Discharge Height)", { unit: "ft", default: 9, max: 40, step: 0.5 }),
      numberField("horizontalRun", "Horizontal Pipe Run", { unit: "ft", default: 20, max: 200, step: 1 }),
    ],
    calcResult: { label: "Pump GPH Needed", format: "number" },
    calcResults: [
      { key: "pumpGphNeeded", label: "Pump Capacity Needed at Your Head (GPH)", format: "number", highlight: true },
      { key: "inflowGph", label: "Measured Inflow (GPH)", format: "number" },
      { key: "totalHeadFt", label: "Total Head (ft)", format: "number" },
      { key: "horsepowerCode", label: "Horsepower (1 = 1/3 HP, 2 = 1/2 HP, 3 = 3/4 HP, 4 = 1 HP)", format: "number" },
      { key: "pitGallonsPerInch", label: "Pit Gallons per Inch", format: "number" },
    ],
    instructions: "During heavy rain, unplug the pump and time how many inches the water rises in a minute (plug it back in!). Enter the pit diameter, the rise and time, the vertical lift and horizontal pipe run.",
    examples: "Example: an 18 in pit rising 5 in per minute takes in 330 GPH. With 9 ft of lift and 20 ft of pipe (total head 11 ft), choose a pump rated for at least 496 GPH at that head — horsepower code 2.",
    assumptions: "Gallons per inch = π × (diameter ÷ 2)² ÷ 231. Total head ≈ vertical lift + horizontal run ÷ 10. A 50% safety margin covers the worst storms. Check the pump's flow chart at your total head, not its maximum GPH. A battery backup pump protects against power cuts. " + PRO_NOTE,
    faq: [
      { question: "What size sump pump do I need?", answer: "Most homes do well with a 1/3 or 1/2 HP pump; measure how fast your pit fills and check the pump's GPH at your total lift." },
      { question: "How do I measure sump pit inflow?", answer: "Unplug the pump during heavy rain, time the water rise for one minute, then plug it back in. Multiply inches by the pit's gallons per inch." },
    ],
  },
  {
    slug: "water-heater-size-calculator",
    title: "Water Heater Size Calculator",
    description: "Find the right tank water heater size — gallons and first-hour rating — from your household size and peak-hour hot water use, for gas or electric.",
    metaTitle: "Water Heater Size Calculator — Tank Gallons",
    metaDescription: "Free water heater size calculator. Find the tank size and first-hour rating you need from household size and peak-hour hot water use.",
    calcInputs: [
      numberField("people", "People in the Home", { default: 4, min: 1, max: 12 }),
      numberField("showers", "Showers in the Busiest Hour", { default: 3, max: 10 }),
      numberField("baths", "Baths in the Busiest Hour", { default: 0, max: 5, required: false }),
      numberField("dishwasher", "Dishwasher Loads", { default: 1, max: 3, required: false }),
      numberField("laundry", "Hot Laundry Loads", { default: 0, max: 3, required: false }),
      numberField("sinkUses", "Hand Washing / Sink Uses", { default: 4, max: 20, required: false }),
      dropdown("fuel", "Fuel", [["Gas", 0], ["Electric", 1]], 0),
    ],
    calcResult: { label: "Tank Size", format: "number" },
    calcResults: [
      { key: "tankSizeGallons", label: "Tank Size (Gallons)", format: "number", highlight: true },
      { key: "firstHourRatingNeeded", label: "First-Hour Rating Needed (Gallons)", format: "number" },
      { key: "peakHourGallons", label: "Peak-Hour Hot Water Use (Gallons)", format: "number" },
      { key: "sizeByHousehold", label: "Typical Size for Household (Gallons)", format: "number" },
    ],
    instructions: "Think about your busiest hour — usually the morning — and count the showers, baths, dishwasher and laundry loads that happen in it. Match the first-hour rating (FHR) on the water heater's label to the figure shown.",
    examples: "Example: four people with three showers, a dishwasher load and some sink use in the busiest hour use about 44 gallons, so look for a FHR of at least 44 — a 50 gallon gas tank.",
    assumptions: "Hot water per use: shower about 10 gal (low-flow), bath 20, dishwasher 6, laundry 7, sink 2. Gas heaters recover faster, so a smaller gas tank delivers the same first-hour rating as a larger electric one. Heat pump water heaters have lower first-hour ratings. " + PRO_NOTE,
    faq: [
      { question: "What size water heater for a family of 4?", answer: "Usually a 50-gallon tank (40–50 gas, 50–65 electric), with a first-hour rating around 65–75 gallons." },
      { question: "What is first-hour rating?", answer: "How many gallons of hot water the heater can deliver in an hour starting with a full tank — shown on the yellow EnergyGuide label." },
    ],
  },
  {
    slug: "tankless-water-heater-size-calculator",
    title: "Tankless Water Heater Size Calculator",
    description: "Size a tankless water heater — the flow rate (GPM) for fixtures used at once, the temperature rise from your groundwater, and the gas BTUs or electric kW and amps needed.",
    metaTitle: "Tankless Water Heater Size Calculator — GPM & BTU",
    metaDescription: "Free tankless water heater size calculator. Find the GPM, temperature rise, gas BTU or electric kW and amps your home needs.",
    calcInputs: [
      numberField("showers", "Showers at Once", { default: 2, max: 6 }),
      numberField("faucets", "Faucets at Once", { default: 1, max: 6, required: false }),
      numberField("dishwasher", "Dishwasher Running?", { default: 0, max: 1, required: false }),
      numberField("washer", "Washing Machine (Hot)?", { default: 0, max: 1, required: false }),
      numberField("tubs", "Bathtubs Filling", { default: 0, max: 2, required: false }),
      numberField("groundTemp", "Incoming Water Temperature", { unit: "°F", default: 50, max: 80, step: 1 }),
      numberField("outputTemp", "Desired Hot Water Temperature", { unit: "°F", default: 120, max: 140, step: 1 }),
    ],
    calcResult: { label: "Flow (GPM)", format: "number" },
    calcResults: [
      { key: "flowGpm", label: "Flow Rate Needed (GPM)", format: "number", highlight: true },
      { key: "temperatureRiseF", label: "Temperature Rise (°F)", format: "number" },
      { key: "gasBtuNeeded", label: "Gas Input Needed (BTU/hr)", format: "number" },
      { key: "electricKwNeeded", label: "Electric Power Needed (kW)", format: "number" },
      { key: "ampsAt240v", label: "Electric Amps at 240 V", format: "number" },
    ],
    instructions: "Count the fixtures that might run at the same time and enter your incoming water temperature — colder climates (around 40°F) need a bigger unit than warm ones (around 70°F).",
    examples: "Example: two showers and a faucet at once need 5 GPM. Heating 50°F water to 120°F (a 70°F rise) takes about 184,211 BTU/hr of gas or 51.24 kW of electricity.",
    assumptions: "Flow: shower 2.0 GPM, faucet 1.0, dishwasher 1.5, washer 2.0, tub 4.0. Gas BTU = GPM × 500 × rise ÷ 0.95 efficiency; electric kW = GPM × rise ÷ 6.83. Whole-house electric tankless units often need 120–160 A of service capacity. " + PRO_NOTE,
    faq: [
      { question: "What size tankless water heater do I need?", answer: "Add up the GPM of fixtures used at once and match a unit that delivers that flow at your temperature rise — often 6–9 GPM for a family home." },
      { question: "Why do tankless heaters deliver less in winter?", answer: "Colder incoming water needs a bigger temperature rise, which reduces the flow the heater can supply." },
    ],
  },
  {
    slug: "water-softener-size-calculator",
    title: "Water Softener Size Calculator",
    description: "Find the water softener size (grain capacity) for your household and water hardness, how often it will regenerate and the salt it uses.",
    metaTitle: "Water Softener Size Calculator — Grain Capacity",
    metaDescription: "Free water softener size calculator. Find the grain capacity you need from household size, water hardness and iron, plus regeneration and salt.",
    calcInputs: [
      numberField("people", "People in the Home", { default: 4, min: 1, max: 15 }),
      numberField("hardnessGpg", "Water Hardness", { unit: "gpg", default: 12, max: 100, step: 0.5 }),
      numberField("ironPpm", "Iron (Optional)", { unit: "ppm", default: 0.5, max: 10, step: 0.1, required: false }),
      numberField("gallonsPerPerson", "Water Use per Person per Day", { unit: "gallons", default: 75, max: 200, step: 5 }),
    ],
    calcResult: { label: "Softener Capacity", format: "number" },
    calcResults: [
      { key: "softenerCapacityGrains", label: "Softener Size (Grains)", format: "number", highlight: true },
      { key: "grainsPerDay", label: "Hardness Removed per Day (Grains)", format: "number" },
      { key: "grainsPerWeek", label: "Hardness Removed per Week (Grains)", format: "number" },
      { key: "daysBetweenRegeneration", label: "Days Between Regenerations", format: "number" },
      { key: "saltPerRegenerationLb", label: "Salt per Regeneration (lb, Efficient Setting)", format: "number" },
    ],
    instructions: "Enter the number of people, your water hardness in grains per gallon (divide mg/L or ppm by 17.1) and any iron from a water test.",
    examples: "Example: four people with 12 gpg water and 0.5 ppm iron remove about 4,350 grains a day, so a 48,000-grain softener regenerates about every 8.28 days.",
    assumptions: "Daily grains = people × gallons per person × (hardness + 5 × iron ppm). Sized so a weekly regeneration uses about 75% of rated capacity at an efficient salt setting (about 3,000 grains per lb of salt). Very high iron may need a separate iron filter.",
    faq: [
      { question: "What size water softener do I need?", answer: "Multiply people × 75 gallons × hardness to get grains per day, then choose a softener that covers about a week — a family of four with 12 gpg water usually needs about 32,000–48,000 grains." },
      { question: "How do I convert ppm to grains per gallon?", answer: "Divide parts per million (mg/L) by 17.1. For example, 205 ppm is 12 gpg." },
    ],
  },
  {
    slug: "garage-door-spring-size-calculator",
    title: "Garage Door Spring Size Calculator",
    description: "Estimate torsion spring requirements for a garage door — total torque, turns to wind and inch-pounds per turn (IPPT) for one or two springs — and a likely wire size.",
    metaTitle: "Garage Door Spring Size Calculator — IPPT & Turns",
    metaDescription: "Free garage door spring size calculator. Estimate torque, winding turns and IPPT for torsion springs from door weight and height.",
    calcInputs: [
      numberField("doorWeight", "Door Weight", { unit: "lb", default: 150, max: 1000, step: 5 }),
      numberField("doorHeight", "Door Height", { unit: "ft", default: 7, max: 16, step: 0.5 }),
      numberField("drumDiameter", "Cable Drum Diameter", { unit: "in", default: 4, max: 12, step: 0.25 }),
      numberField("springs", "Number of Springs", { default: 2, min: 1, max: 4 }),
    ],
    calcResult: { label: "IPPT per Spring", format: "number" },
    calcResults: [
      { key: "ipptPerSpring", label: "Inch-Pounds per Turn per Spring (IPPT)", format: "number", highlight: true },
      { key: "turnsToWind", label: "Turns to Wind", format: "number" },
      { key: "totalTorqueInLb", label: "Total Torque (in-lb)", format: "number" },
      { key: "wireSizeCode", label: "Likely Wire Size (1 ≈ .207, 2 ≈ .218, 3 ≈ .225–.234, 4 ≈ .243–.250, 5 ≈ .262+)", format: "number" },
      { key: "springsUsed", label: "Springs", format: "number" },
    ],
    instructions: "Enter the door's weight (weigh it with a bathroom scale with the springs released, or check the manufacturer's spec), its height, the drum diameter and the number of springs.",
    examples: "Example: a 150 lb, 7 ft door on standard 4 in drums needs 300 in-lb of torque and 7.68 turns; with two springs, each needs about 19.52 IPPT.",
    assumptions: "Torque = door weight × drum radius; turns = door height ÷ drum circumference + 1. Real spring selection also depends on wire size, inside diameter and length, which set the cycle life. Torsion springs store dangerous energy — winding and replacement are best left to a trained technician.",
    faq: [
      { question: "How many turns does a garage door spring need?", answer: "About 7.5 to 8 turns for a 7 ft door on standard 4 inch drums, and about 8.5 for an 8 ft door." },
      { question: "Can I replace garage door springs myself?", answer: "It's possible but dangerous — a wound torsion spring can cause serious injury. Most people hire a pro." },
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
