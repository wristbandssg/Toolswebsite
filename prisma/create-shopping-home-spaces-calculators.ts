// One-time (but safe to re-run) batch setup script: creates 10 door, garage, shed, kitchen, outdoor and lighting size tools
// from the user's shopping list (Shopping Calculators > Home Improvement Cost & Sizing Calculators).
// See src/lib/calc-engine-shopping-home-spaces.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-home-spaces-calculators.ts
// or
//   npm run db:create-shopping-home-spaces-calculators

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

const CODE_NOTE = "Building codes and manufacturers' instructions come first — check local requirements before you buy or build.";

const TOOLS: ToolDef[] = [
  {
    slug: "door-size-calculator",
    title: "Door Size Calculator",
    description: "Convert between a door slab size and the rough opening it needs — or find the slab for an existing opening — with the prehung unit width and standard door size.",
    metaTitle: "Door Size Calculator — Rough Opening & Slab Size",
    metaDescription: "Free door size calculator. Find the rough opening for a door, or the door size for an opening, plus prehung unit width and standard sizes.",
    calcInputs: [
      dropdown("mode", "I Know the", [["Door slab size", 0], ["Rough opening size", 1]], 0),
      numberField("width", "Width", { unit: "in", default: 32, max: 120, step: 0.125 }),
      numberField("height", "Height", { unit: "in", default: 80, max: 144, step: 0.125 }),
    ],
    calcResult: { label: "Rough Opening Width", format: "number" },
    calcResults: [
      { key: "roughOpeningWidth", label: "Rough Opening Width (in)", format: "number", highlight: true },
      { key: "roughOpeningHeight", label: "Rough Opening Height (in)", format: "number" },
      { key: "slabWidth", label: "Door Slab Width (in)", format: "number" },
      { key: "slabHeight", label: "Door Slab Height (in)", format: "number" },
      { key: "prehungUnitWidth", label: "Prehung Unit Outside Width (in, Approx.)", format: "number" },
      { key: "standardSizeCode", label: "Standard Width (0 Custom, 1 24\", 2 28\", 3 30\", 4 32\", 5 36\")", format: "number" },
    ],
    instructions: "Choose whether you know the door slab size or the rough opening (the framed hole in the wall), and enter its width and height.",
    examples: "Example: a 32 × 80 in door needs a rough opening of 34 × 82.5 in.",
    assumptions: "Rough opening ≈ door width + 2 in and height + 2.5 in (room for the jambs, shims and a gap at the floor). Exterior doors and some brands differ — follow the manufacturer's rough-opening chart. Standard interior doors are 80 in tall. " + CODE_NOTE,
    faq: [
      { question: "What is the rough opening for a 36 inch door?", answer: "About 38 inches wide by 82.5 inches tall for a standard 36 × 80 door." },
      { question: "How do I measure a door size?", answer: "Measure the width and height of the door slab itself; door sizes are often written in feet and inches, like 2/8 × 6/8 (32 × 80 in)." },
    ],
  },
  {
    slug: "garage-door-size-calculator",
    title: "Garage Door Size Calculator",
    description: "Find the right garage door width and height for your vehicles — single or double doors, wide trucks and tall vehicles — plus the headroom and side room the tracks need.",
    metaTitle: "Garage Door Size Calculator — Width & Height",
    metaDescription: "Free garage door size calculator. Find garage door width and height for your cars and trucks, single or double doors, plus headroom needed.",
    calcInputs: [
      numberField("vehicles", "Vehicles", { default: 2, min: 1, max: 4 }),
      dropdown("layout", "Door Layout", [["One wide door", 0], ["One door per vehicle", 1]], 0),
      dropdown("wideVehicles", "Full-Size Trucks or Wide Vehicles?", [["No", 0], ["Yes", 1]], 1),
      numberField("tallestVehicle", "Tallest Vehicle Height", { unit: "ft", default: 6.5, max: 14, step: 0.1 }),
    ],
    calcResult: { label: "Door Width", format: "number" },
    calcResults: [
      { key: "doorWidthFt", label: "Door Width (ft)", format: "number", highlight: true },
      { key: "doorHeightFt", label: "Door Height (ft)", format: "number" },
      { key: "doorsNeeded", label: "Doors", format: "number" },
      { key: "headroomIn", label: "Headroom Above the Door (in)", format: "number" },
      { key: "sideRoomIn", label: "Side Room Each Side (in)", format: "number" },
      { key: "backroomFt", label: "Backroom (Depth for Tracks, ft)", format: "number" },
    ],
    instructions: "Enter how many vehicles the door serves, whether you want one wide door or one per vehicle, whether any are full-size trucks or wide SUVs, and the tallest vehicle's height including roof racks.",
    examples: "Example: two vehicles including a full-size truck through one door need an 18 ft wide by 7 ft tall door, with about 15 in of headroom.",
    assumptions: "Common sizes: single 8–10 ft wide, double 16–18 ft; 7 ft tall standard, 8 ft for trucks, vans and roof racks. Standard torsion tracks need about 12–15 in of headroom, 3.75–4 in side room and backroom of door height + 18 in. " + CODE_NOTE,
    faq: [
      { question: "What is the standard size of a two-car garage door?", answer: "16 feet wide by 7 feet tall; 18 × 8 ft gives more room for trucks and big SUVs." },
      { question: "How much headroom does a garage door need?", answer: "About 12–15 inches above the opening for standard tracks; low-headroom kits can work with less." },
    ],
  },
  {
    slug: "garage-size-calculator",
    title: "Garage Size Calculator",
    description: "Work out the garage dimensions you need for one, two or three cars — minimum or comfortable — plus truck length, a workshop and storage space.",
    metaTitle: "Garage Size Calculator — 1, 2 & 3 Car Garages",
    metaDescription: "Free garage size calculator. Find the width, depth and square footage for a 1, 2 or 3 car garage with room for a truck, workshop or storage.",
    calcInputs: [
      numberField("cars", "Cars", { default: 2, min: 1, max: 6 }),
      dropdown("comfort", "Fit", [["Minimum", 0], ["Comfortable (open doors, walk around)", 1]], 1),
      dropdown("truck", "Full-Size Truck?", [["No", 0], ["Yes (+4 ft depth)", 1]], 0),
      numberField("workshopDepth", "Extra Depth for a Workbench", { unit: "ft", default: 4, max: 20, step: 1, required: false }),
      numberField("storageWidth", "Extra Width for Storage", { unit: "ft", default: 2, max: 20, step: 1, required: false }),
    ],
    calcResult: { label: "Width", format: "number" },
    calcResults: [
      { key: "widthFt", label: "Garage Width (ft)", format: "number", highlight: true },
      { key: "depthFt", label: "Garage Depth (ft)", format: "number" },
      { key: "floorAreaSqFt", label: "Floor Area (sq ft)", format: "number" },
      { key: "doorWidthNeeded", label: "Door Width (ft)", format: "number" },
    ],
    instructions: "Enter the number of cars and choose minimum or comfortable spacing. Add depth for a truck or workbench and width for shelves, bikes or bins.",
    examples: "Example: a comfortable two-car garage with a 4 ft workbench and 2 ft of side storage should be about 28 × 28 ft (784 sq ft).",
    assumptions: "Minimum: 10 ft of width per car and 22 ft deep; comfortable: 12 ft per car plus 2 ft, 24 ft deep. Full-size trucks need about 26–28 ft of depth. " + CODE_NOTE,
    faq: [
      { question: "What is a good size for a two-car garage?", answer: "At least 20 × 20 feet; 24 × 24 feet is comfortable and leaves room for storage." },
      { question: "How deep should a garage be for a truck?", answer: "About 26–28 feet, since full-size crew-cab pickups are 19–21 feet long." },
    ],
  },
  {
    slug: "storage-shed-size-calculator",
    title: "Storage Shed Size Calculator",
    description: "Find the shed size you need from what you'll store — riding and push mowers, bikes, bins, kayaks and a workbench — plus room to move, matched to standard shed sizes.",
    metaTitle: "Storage Shed Size Calculator — What Size Shed?",
    metaDescription: "Free storage shed size calculator. Add up mowers, bikes, bins and tools to find the floor area and standard shed size you need.",
    calcInputs: [
      numberField("ridingMowers", "Riding Mowers / Garden Tractors", { default: 1, max: 5 }),
      numberField("pushMowers", "Push Mowers, Snow Blowers, Wheelbarrows", { default: 2, max: 10 }),
      numberField("bikes", "Bikes", { default: 3, max: 20 }),
      numberField("bins", "Storage Bins / Shelving Units (2 × 1.5 ft)", { default: 6, max: 100 }),
      numberField("kayaks", "Kayaks or Paddleboards (on the Floor)", { default: 0, max: 10, required: false }),
      numberField("workbench", "Workbenches", { default: 0, max: 3, required: false }),
      numberField("otherSqFt", "Other Items (sq ft)", { default: 10, max: 500, required: false }),
    ],
    calcResult: { label: "Shed Width", format: "number" },
    calcResults: [
      { key: "shedWidthFt", label: "Shed Width (ft)", format: "number", highlight: true },
      { key: "shedDepthFt", label: "Shed Depth (ft)", format: "number" },
      { key: "shedAreaSqFt", label: "Shed Area (sq ft)", format: "number" },
      { key: "itemFootprintSqFt", label: "Item Footprint (sq ft)", format: "number" },
      { key: "areaNeededSqFt", label: "Area Needed With Access (sq ft)", format: "number" },
    ],
    instructions: "Count what you'll store. The calculator adds each item's footprint and 40% for walking and reaching space, then picks the smallest standard shed that fits.",
    examples: "Example: a riding mower, two push mowers, three bikes, six bins and 10 sq ft of extras need about 137.2 sq ft — a 10 × 14 ft shed.",
    assumptions: "Typical footprints: riding mower 30 sq ft, push mower 8, bike 8, bin or shelf 3, kayak 10, workbench 16. Hanging bikes and tools on walls saves floor space. Many towns need a permit for sheds over 120–200 sq ft.",
    faq: [
      { question: "What size shed do I need for a riding mower?", answer: "At least 8 × 10 feet for the mower alone; 10 × 12 or larger if you'll store other tools too." },
      { question: "Do I need a permit for a shed?", answer: "Often not for small sheds (commonly under 120 or 200 square feet), but rules vary by town and HOA." },
    ],
  },
  {
    slug: "kitchen-island-size-calculator",
    title: "Kitchen Island Size Calculator",
    description: "Find the largest kitchen island that still leaves 42–48 inch aisles, whether it can have seating, and how many stools it fits.",
    metaTitle: "Kitchen Island Size Calculator — Fit & Seating",
    metaDescription: "Free kitchen island size calculator. Find the island length and depth that fit your kitchen with proper aisles, and how many seats it allows.",
    calcInputs: [
      numberField("kitchenLength", "Kitchen Length", { unit: "ft", default: 16, max: 60, step: 0.5 }),
      numberField("kitchenWidth", "Kitchen Width (Wall to Wall)", { unit: "ft", default: 13, max: 60, step: 0.5 }),
      dropdown("layout", "Counters Along", [["One long wall", 0], ["Both long walls", 1]], 0),
      numberField("counterDepth", "Counter Depth", { unit: "in", default: 25, max: 36, step: 0.5 }),
      dropdown("twoCooks", "Two Cooks at Once?", [["No (42 in aisles)", 0], ["Yes (48 in aisles)", 1]], 0),
    ],
    calcResult: { label: "Island Length", format: "number" },
    calcResults: [
      { key: "islandLength", label: "Island Length (in)", format: "number", highlight: true },
      { key: "islandDepth", label: "Island Depth (in)", format: "number" },
      { key: "seats", label: "Seats (24 in Each)", format: "number" },
      { key: "seatingOverhang", label: "Seating Overhang (in)", format: "number" },
      { key: "aisleWidth", label: "Aisle Width (in)", format: "number" },
      { key: "fitsIsland", label: "Room for an Island? (1 = Yes)", format: "number" },
    ],
    instructions: "Enter the kitchen's size, whether counters run along one or both long walls, the counter depth and whether two people cook at once.",
    examples: "Example: a 16 × 13 ft kitchen with counters on one wall fits an island about 108 × 47 in with 42 in aisles, seating 4.",
    assumptions: "NKBA guidelines: 42 in aisles for one cook, 48 in for two; at least 24 in of width per seated person and a 12–15 in overhang for knees. Islands should generally be at least 24 in deep and 48 in long to be useful.",
    faq: [
      { question: "How much space do you need around a kitchen island?", answer: "At least 42 inches of aisle on working sides, 48 inches if two people cook, and 36 inches on non-working sides." },
      { question: "How big does an island need to be for seating?", answer: "About 36 inches deep or more with a 12–15 inch overhang, and 24 inches of length per stool." },
    ],
  },
  {
    slug: "range-hood-size-calculator",
    title: "Range Hood Size Calculator",
    description: "Find the right range hood width and fan power (CFM) for a gas or electric cooktop, wall or island mount, plus mounting height and duct size.",
    metaTitle: "Range Hood Size Calculator — Width & CFM",
    metaDescription: "Free range hood size calculator. Find hood width, CFM for gas or electric cooktops, mounting height, duct size and if make-up air is needed.",
    calcInputs: [
      numberField("cooktopWidth", "Cooktop / Range Width", { unit: "in", default: 30, max: 72, step: 1 }),
      dropdown("fuel", "Cooktop Type", [["Gas", 0], ["Electric / induction", 1]], 0),
      numberField("btu", "Total Burner BTUs (Gas)", { default: 50000, max: 200000, step: 1000, required: false }),
      dropdown("mounting", "Mounting", [["Wall (under cabinet or chimney)", 0], ["Island", 1]], 0),
    ],
    calcResult: { label: "Recommended CFM", format: "number" },
    calcResults: [
      { key: "recommendedCfm", label: "Recommended Fan Power (CFM)", format: "number", highlight: true },
      { key: "hoodWidth", label: "Hood Width (in)", format: "number" },
      { key: "mountHeightLow", label: "Mount Height Above Cooktop From (in)", format: "number" },
      { key: "mountHeightHigh", label: "Mount Height Above Cooktop To (in)", format: "number" },
      { key: "ductDiameter", label: "Duct Diameter (in)", format: "number" },
      { key: "makeupAirLikely", label: "Make-Up Air May Be Required? (1 = Yes)", format: "number" },
    ],
    instructions: "Enter the cooktop width and type. For gas, add up the BTU ratings of all burners. Choose wall or island mounting — island hoods need more power because there's no wall to guide smoke.",
    examples: "Example: a 30 in gas range with 50,000 total BTUs needs about 500 CFM, a 33 in wall hood mounted 24–30 in above, and a 7 in duct.",
    assumptions: "Gas: 1 CFM per 100 BTU; electric: about 10 CFM per inch of cooktop width; island hoods about 20% more. The hood should be at least as wide as the cooktop (3 in wider is better; 6 in for islands). Many codes require make-up air for hoods over 400 CFM. " + CODE_NOTE,
    faq: [
      { question: "How many CFM do I need for a range hood?", answer: "About 1 CFM per 100 BTU for gas (a 50,000 BTU range needs 500 CFM) or 10 CFM per inch of width for electric." },
      { question: "How high should a range hood be above the stove?", answer: "Usually 24–30 inches above a gas cooktop and 20–24 inches above electric, unless the manufacturer says otherwise." },
    ],
  },
  {
    slug: "fire-pit-size-calculator",
    title: "Fire Pit Size Calculator",
    description: "Find the right fire pit diameter and seating area for the number of people — how big the circle of chairs and patio should be — and how far to keep it from the house.",
    metaTitle: "Fire Pit Size Calculator — Pit & Seating Area",
    metaDescription: "Free fire pit size calculator. Find the fire pit diameter, seating circle and patio size for your group, plus clearance from the house.",
    calcInputs: [
      numberField("people", "People Seated", { default: 6, min: 2, max: 20 }),
      numberField("seatDistance", "Gap From Pit Edge to Chairs", { unit: "in", default: 30, max: 60, step: 1 }),
      numberField("chairDepth", "Chair Depth", { unit: "in", default: 30, max: 48, step: 1 }),
      dropdown("fuel", "Fuel", [["Wood-burning", 0], ["Gas / propane", 1]], 0),
    ],
    calcResult: { label: "Fire Pit Diameter", format: "number" },
    calcResults: [
      { key: "firePitDiameter", label: "Fire Pit Diameter (in)", format: "number", highlight: true },
      { key: "seatingCircleDiameterFt", label: "Seating Area Diameter (ft)", format: "number" },
      { key: "patioAreaSqFt", label: "Patio Area Needed (sq ft)", format: "number" },
      { key: "clearanceFromHouseFt", label: "Keep This Far From Structures (ft)", format: "number" },
    ],
    instructions: "Enter how many people will sit around the fire, the gap you want between the pit and the chairs, the chair depth and the fuel type.",
    examples: "Example: six people around a wood fire pit suit a 40 in pit with a seating area about 13.33 ft across — roughly 140 sq ft of patio.",
    assumptions: "Fire pits are usually 36–44 in across (inside 24–30 in). Leave 24–36 in from the pit edge to the chairs and allow about 30 in of circumference per seat. Wood fires typically need 10–25 ft from structures and overhanging branches; check local rules and HOA restrictions.",
    faq: [
      { question: "What size fire pit for 6 people?", answer: "About 36–44 inches across, with a seating circle about 13–16 feet across, depending on chair size." },
      { question: "How far should a fire pit be from a house?", answer: "Often at least 10 feet for gas and 25 feet for wood-burning pits — check local fire codes." },
    ],
  },
  {
    slug: "shade-sail-calculator",
    title: "Shade Sail Calculator",
    description: "Work out the shade sail size to buy from the distance between your fixing points — allowing for tensioning hardware — the area it shades and its cost.",
    metaTitle: "Shade Sail Calculator — Sail Size & Cost",
    metaDescription: "Free shade sail calculator. Find the sail size from your post spacing, allowing for hardware, plus the shaded area and estimated cost.",
    calcInputs: [
      dropdown("shape", "Sail Shape", [["Square / rectangle", 0], ["Right triangle", 1]], 0),
      numberField("sideA", "Distance Between Fixing Points — Side A", { unit: "ft", default: 16, max: 100, step: 0.5 }),
      numberField("sideB", "Distance Between Fixing Points — Side B", { unit: "ft", default: 14, max: 100, step: 0.5 }),
      currencyField("pricePerSqFt", "Sail Price per Sq Ft", { default: 3.5, max: 50, step: 0.25, required: false }),
    ],
    calcResult: { label: "Sail Side A", format: "number" },
    calcResults: [
      { key: "sailSideA", label: "Sail Size — Side A (ft)", format: "number", highlight: true },
      { key: "sailSideB", label: "Sail Size — Side B (ft)", format: "number" },
      { key: "shadeAreaSqFt", label: "Shaded Area (sq ft)", format: "number" },
      { key: "estimatedSailCost", label: "Estimated Sail Cost", format: "currency" },
      { key: "hardwareAllowanceFt", label: "Hardware Allowance per Side (ft)", format: "number" },
    ],
    instructions: "Measure between the posts or wall brackets where the sail will attach and choose the shape. The sail must be smaller than that span so turnbuckles and shackles can tension it.",
    examples: "Example: fixing points 16 × 14 ft apart call for about a 14.6 × 12.6 ft sail, shading 183.96 sq ft for about $643.86.",
    assumptions: "Leave about 10% of the span (at least 6 in) per side for tensioning hardware. Mount one or two corners lower so rain runs off, and anchor posts in concrete. Custom sails and heavy-duty fabrics cost more.",
    faq: [
      { question: "How much smaller should a shade sail be than the posts?", answer: "Roughly 10% shorter on each side — about 1–2 feet for a medium sail — to leave room for hardware and tension." },
      { question: "Why do shade sails need a slope?", answer: "A twist or slope sheds rain and stops water pooling, which can stretch or tear the fabric." },
    ],
  },
  {
    slug: "recessed-lighting-spacing-calculator",
    title: "Recessed Lighting Spacing Calculator",
    description: "Plan recessed lights — spacing from ceiling height, how many cans in rows and columns, distance from walls and the lumens each needs for the room.",
    metaTitle: "Recessed Lighting Spacing Calculator — Layout",
    metaDescription: "Free recessed lighting spacing calculator. Find can light spacing, how many lights, distance from walls and lumens per light for any room.",
    calcInputs: [
      numberField("roomLength", "Room Length", { unit: "ft", default: 16, max: 100, step: 0.5 }),
      numberField("roomWidth", "Room Width", { unit: "ft", default: 12, max: 100, step: 0.5 }),
      numberField("ceilingHeight", "Ceiling Height", { unit: "ft", default: 8, max: 30, step: 0.5 }),
      dropdown("roomType", "Room Use", [["Bedroom", 0], ["Living / family room", 1], ["Dining room", 2], ["Kitchen / bathroom", 3], ["Office / workshop", 4]], 1),
    ],
    calcResult: { label: "Lights Needed", format: "number" },
    calcResults: [
      { key: "lightsNeeded", label: "Recessed Lights Needed", format: "number", highlight: true },
      { key: "spacingFt", label: "Spacing Between Lights (ft)", format: "number" },
      { key: "rows", label: "Rows", format: "number" },
      { key: "perRow", label: "Lights per Row", format: "number" },
      { key: "distanceFromWallFt", label: "Distance From Walls (ft)", format: "number" },
      { key: "lumensPerLight", label: "Lumens per Light", format: "number" },
    ],
    instructions: "Enter the room size, ceiling height and how the room is used. The layout spreads lights evenly in a grid with half the spacing at the walls.",
    examples: "Example: a 16 × 12 ft living room with an 8 ft ceiling needs about 12 lights (3 rows of 4), 4 ft apart and 2 ft from the walls, around 320 lumens each.",
    assumptions: "Spacing ≈ ceiling height ÷ 2; first row about half that from the walls. Light levels: bedroom 10 foot-candles, living 20, dining 30, kitchen/bath 50, office 70. Task lighting over counters and wall-washing may need extra lights.",
    faq: [
      { question: "How far apart should recessed lights be?", answer: "About half the ceiling height — 4 feet apart on an 8 foot ceiling — and about 2 feet from walls." },
      { question: "How many recessed lights do I need?", answer: "Roughly one per 4 × 4 ft area on an 8 ft ceiling; a 12 × 16 ft room needs about 12 for even light." },
    ],
  },
  {
    slug: "lumens-calculator",
    title: "Lumens Calculator",
    description: "Work out how many lumens a room needs for its use, how many bulbs that takes, and the LED and old incandescent wattage equivalents.",
    metaTitle: "Lumens Calculator — How Much Light a Room Needs",
    metaDescription: "Free lumens calculator. Find the lumens a room needs by size and use, how many bulbs, LED watts and incandescent equivalent.",
    calcInputs: [
      numberField("roomLength", "Room Length", { unit: "ft", default: 12, max: 100, step: 0.5 }),
      numberField("roomWidth", "Room Width", { unit: "ft", default: 10, max: 100, step: 0.5 }),
      dropdown("roomType", "Room Use", [["Bedroom", 0], ["Living / family room", 1], ["Dining room", 2], ["Kitchen / bathroom", 3], ["Office / workshop", 4]], 3),
      dropdown("darkSurfaces", "Dark Walls or Floors?", [["No", 0], ["Yes (+25%)", 1]], 0),
      numberField("lumensPerBulb", "Lumens per Bulb", { default: 800, max: 10000, step: 50 }),
    ],
    calcResult: { label: "Lumens Needed", format: "number" },
    calcResults: [
      { key: "lumensNeeded", label: "Lumens Needed", format: "number", highlight: true },
      { key: "bulbsNeeded", label: "Bulbs Needed", format: "number" },
      { key: "ledWatts", label: "Total LED Watts", format: "number" },
      { key: "incandescentEquivalentWatts", label: "Old Incandescent Equivalent (W)", format: "number" },
      { key: "footCandles", label: "Light Level Used (Foot-Candles)", format: "number" },
    ],
    instructions: "Enter the room size, its use and whether the walls or floors are dark, plus the lumens of the bulbs you plan to buy (a 60 W-equivalent LED is about 800 lumens).",
    examples: "Example: a 12 × 10 ft kitchen needs about 6,000 lumens — 8 bulbs of 800 lumens, or roughly 67 W of LED lighting.",
    assumptions: "Lumens = area × foot-candles (bedroom 10, living 20, dining 30, kitchen/bath 50, office 70). LEDs give about 90 lumens per watt; incandescent bulbs about 15. Dark surfaces absorb light, so add about 25%.",
    faq: [
      { question: "How many lumens do I need for a kitchen?", answer: "About 50 foot-candles — roughly 5,000–6,000 lumens for a 120 sq ft kitchen, spread between ceiling and task lights." },
      { question: "How many lumens is a 60 watt bulb?", answer: "About 800 lumens; a 100 W equivalent is about 1,600 lumens." },
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
