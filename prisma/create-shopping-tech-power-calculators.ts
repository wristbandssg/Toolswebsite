// One-time (but safe to re-run) batch setup script: creates 11 battery and portable power tools
// from the user's shopping list (Shopping Calculators > Electronics, Energy & Tech Calculators).
// See src/lib/calc-engine-shopping-tech-power.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-tech-power-calculators.ts
// or
//   npm run db:create-shopping-tech-power-calculators

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

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "percentage", unit: "%", required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 0.1 };
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

const BATT_NOTE = "Real battery capacity falls with age, cold and high loads, so treat results as best-case estimates.";

const TOOLS: ToolDef[] = [
  {
    slug: "battery-life-calculator",
    title: "Battery Life Calculator",
    description: "Find how long a battery will last from its capacity in mAh and the device's current draw in mA — in hours, minutes and days — allowing for usable capacity.",
    metaTitle: "Battery Life Calculator — mAh to Hours",
    metaDescription: "Free battery life calculator. Convert battery mAh and device current draw into runtime in hours, minutes and days, with usable capacity.",
    calcInputs: [
      numberField("capacityMah", "Battery Capacity", { unit: "mAh", default: 3000, max: 1000000, step: 10 }),
      numberField("loadMa", "Device Current Draw", { unit: "mA", default: 150, max: 100000, step: 1 }),
      percentField("usablePercent", "Usable Capacity", { default: 85, max: 100, step: 1 }),
    ],
    calcResult: { label: "Battery Life", format: "number" },
    calcResults: [
      { key: "hours", label: "Battery Life (Hours)", format: "number", highlight: true },
      { key: "minutes", label: "Minutes", format: "number" },
      { key: "days", label: "Days", format: "number" },
      { key: "usableMah", label: "Usable Capacity (mAh)", format: "number" },
    ],
    instructions: "Enter the battery's rated capacity and the device's average current draw (from its specs or measured with a multimeter). Usable capacity allows for voltage cut-off and ageing.",
    examples: "Example: a 3,000 mAh battery powering a 150 mA device with 85% usable capacity lasts about 17 hours (1,020 minutes).",
    assumptions: "Battery life = usable mAh ÷ load mA. Devices that sleep and wake draw an average current; use the average, not the peak. " + BATT_NOTE,
    faq: [
      { question: "How do I calculate battery life?", answer: "Divide the battery's mAh by the device's current in mA. A 2,000 mAh battery at 100 mA lasts about 20 hours (less in practice)." },
      { question: "What does mAh mean?", answer: "Milliamp-hours — how many milliamps a battery can supply for one hour." },
    ],
  },
  {
    slug: "battery-charge-time-calculator",
    title: "Battery Charge Time Calculator",
    description: "Estimate how long a battery takes to charge from its capacity and the charger's current — with charging efficiency, partial charges and the slower final top-off.",
    metaTitle: "Battery Charge Time Calculator — Hours to Full",
    metaDescription: "Free battery charge time calculator. Estimate charging time from battery mAh and charger current, with efficiency and top-off time.",
    calcInputs: [
      numberField("capacityMah", "Battery Capacity", { unit: "mAh", default: 5000, max: 1000000, step: 10 }),
      numberField("chargeCurrentMa", "Charging Current", { unit: "mA", default: 2000, max: 200000, step: 10 }),
      percentField("chargeNeeded", "Charge Needed (e.g. 20% → 100% = 80%)", { default: 80, max: 100, step: 5 }),
      percentField("efficiency", "Charging Efficiency", { default: 85, max: 100, step: 1 }),
      dropdown("toFull", "Charging All the Way to 100%?", [["No", 0], ["Yes (adds top-off time)", 1]], 1),
    ],
    calcResult: { label: "Charge Time", format: "number" },
    calcResults: [
      { key: "hours", label: "Charge Time (Hours)", format: "number", highlight: true },
      { key: "minutes", label: "Minutes", format: "number" },
      { key: "cRate", label: "Charge Rate (C)", format: "number" },
    ],
    instructions: "Enter the battery capacity, the charger's current (watts ÷ volts if you only know watts), how much charge you need and the efficiency.",
    examples: "Example: charging 80% of a 5,000 mAh battery at 2,000 mA with 85% efficiency takes about 2.71 hours (162 minutes) including the top-off.",
    assumptions: "Time = mAh needed ÷ (charge current × efficiency); lithium batteries slow down above about 80% (constant-voltage stage), which adds roughly 15%. Charge rates above 1C can shorten battery life. " + BATT_NOTE,
    faq: [
      { question: "How long does it take to charge a battery?", answer: "Divide the capacity needed by the charging current and allow for 10–20% losses; a 5,000 mAh battery at 2 A takes about 3 hours from empty." },
      { question: "Why is the last 20% slower to charge?", answer: "Lithium batteries switch to constant-voltage charging near full, so the current tapers off to protect the cells." },
    ],
  },
  {
    slug: "watt-hours-calculator",
    title: "Watt Hours Calculator",
    description: "Convert battery capacity to watt-hours (Wh) from mAh or Ah and voltage, see how long it runs a load, and whether it's allowed on a plane.",
    metaTitle: "Watt Hours Calculator — mAh to Wh & Airline Limit",
    metaDescription: "Free watt hours calculator. Convert mAh or Ah and volts to watt-hours, find runtime for a load and check airline battery limits.",
    calcInputs: [
      numberField("capacity", "Battery Capacity", { default: 20000, max: 10000000, step: 1 }),
      dropdown("capacityUnit", "Capacity Unit", [["mAh", 0], ["Ah", 1]], 0),
      numberField("voltage", "Battery Voltage", { unit: "V", default: 3.7, max: 1000, step: 0.1 }),
      numberField("loadWatts", "Load to Power (Optional)", { unit: "W", default: 10, max: 10000, step: 1, required: false }),
    ],
    calcResult: { label: "Watt-Hours", format: "number" },
    calcResults: [
      { key: "wattHours", label: "Watt-Hours (Wh)", format: "number", highlight: true },
      { key: "kilowattHours", label: "Kilowatt-Hours (kWh)", format: "number", decimals: 3 },
      { key: "airlineCode", label: "Carry-On Rule (1 Allowed ≤100 Wh, 2 Airline Approval 100–160 Wh, 3 Not Allowed >160 Wh)", format: "number" },
      { key: "runtimeHoursAtLoad", label: "Runtime at the Load (Hours)", format: "number" },
    ],
    instructions: "Enter the capacity and its unit and the battery's nominal voltage (3.6–3.7 V for most lithium-ion cells and power banks, 12.8 V for LiFePO4 12 V batteries).",
    examples: "Example: a 20,000 mAh power bank at 3.7 V holds 74 Wh — airline code 1, fine in carry-on — and runs a 10 W device for about 6.66 hours.",
    assumptions: "Wh = Ah × V (mAh ÷ 1,000 × V). FAA and IATA rules: spare lithium batteries up to 100 Wh are allowed in carry-on, 100–160 Wh need airline approval (two per person), over 160 Wh are not allowed in passenger luggage. Runtime assumes 90% conversion efficiency.",
    faq: [
      { question: "How do I convert mAh to watt-hours?", answer: "Multiply mAh by the voltage and divide by 1,000: 10,000 mAh × 3.7 V ÷ 1,000 = 37 Wh." },
      { question: "What size power bank can I take on a plane?", answer: "Up to 100 Wh (about 27,000 mAh at 3.7 V) without approval, in carry-on only." },
    ],
  },
  {
    slug: "wh-to-mah-calculator",
    title: "WH To MAH Calculator",
    description: "Convert watt-hours to milliamp-hours (or mAh to Wh) at any voltage — for power banks, laptop batteries, e-bikes and more.",
    metaTitle: "Wh to mAh Calculator — Convert Battery Capacity",
    metaDescription: "Free Wh to mAh calculator. Convert watt-hours to milliamp-hours and back at any battery voltage, plus amp-hours.",
    calcInputs: [
      dropdown("direction", "Convert", [["Wh → mAh", 0], ["mAh → Wh", 1]], 0),
      numberField("value", "Value", { default: 99, max: 10000000, step: 0.1 }),
      numberField("voltage", "Voltage", { unit: "V", default: 3.7, max: 1000, step: 0.1 }),
    ],
    calcResult: { label: "mAh", format: "number" },
    calcResults: [
      { key: "milliampHours", label: "Milliamp-Hours (mAh)", format: "number", highlight: true },
      { key: "wattHours", label: "Watt-Hours (Wh)", format: "number" },
      { key: "ampHours", label: "Amp-Hours (Ah)", format: "number" },
      { key: "voltage", label: "Voltage Used (V)", format: "number" },
    ],
    instructions: "Choose the direction, enter the value and the battery's nominal voltage. The same Wh gives very different mAh at different voltages, so use the voltage printed on the battery.",
    examples: "Example: a 99 Wh laptop battery is 26,757 mAh at 3.7 V (cell voltage).",
    assumptions: "mAh = Wh × 1,000 ÷ V; Wh = mAh × V ÷ 1,000. Power banks are rated at the cell voltage (3.6–3.85 V), not the 5 V USB output, so their real output in mAh at 5 V is lower.",
    faq: [
      { question: "How many mAh is 100 Wh?", answer: "About 27,000 mAh at 3.7 V, or 8,300 mAh at 12 V." },
      { question: "Why do I need the voltage to convert Wh to mAh?", answer: "Watt-hours measure energy; mAh measure charge. Energy = charge × voltage, so the voltage links the two." },
    ],
  },
  {
    slug: "ups-battery-backup-calculator",
    title: "UPS Battery Backup Calculator",
    description: "Estimate how long a UPS battery backup will run your computer, router or other equipment — from battery voltage, amp-hours, load and inverter efficiency — and the VA rating you need.",
    metaTitle: "UPS Battery Backup Calculator — Runtime & VA",
    metaDescription: "Free UPS battery backup calculator. Estimate UPS runtime from battery Ah, voltage and load watts, and the VA rating your equipment needs.",
    calcInputs: [
      numberField("batteryVoltage", "Battery Voltage", { unit: "V", default: 12, max: 480, step: 1 }),
      numberField("batteryAh", "Battery Capacity", { unit: "Ah", default: 9, max: 1000, step: 0.5 }),
      numberField("batteries", "Number of Batteries", { default: 2, min: 1, max: 40 }),
      numberField("loadWatts", "Equipment Load", { unit: "W", default: 150, max: 20000, step: 5 }),
      percentField("depthOfDischarge", "Usable Battery Capacity", { default: 80, max: 100, step: 5 }),
      percentField("inverterEfficiency", "Inverter Efficiency", { default: 90, max: 100, step: 1 }),
    ],
    calcResult: { label: "Runtime", format: "number" },
    calcResults: [
      { key: "runtimeMinutes", label: "Backup Runtime (Minutes)", format: "number", highlight: true },
      { key: "runtimeHours", label: "Runtime (Hours)", format: "number" },
      { key: "batteryWh", label: "Battery Energy (Wh)", format: "number" },
      { key: "usableWh", label: "Usable Energy (Wh)", format: "number" },
      { key: "vaRatingNeeded", label: "UPS VA Rating Needed", format: "number" },
    ],
    instructions: "Enter the UPS battery voltage and amp-hours (on the battery label), how many batteries it has and the watts of everything plugged into it. Check the UPS's own runtime chart too.",
    examples: "Example: two 12 V 9 Ah batteries running a 150 W computer and router give about 62 minutes of backup; you need a UPS of at least 250 VA.",
    assumptions: "Runtime = battery Wh × usable share × inverter efficiency ÷ load. Lead-acid batteries deliver less at high loads (Peukert effect), so short runtimes are often lower than this. VA ≈ watts ÷ 0.6 for a safe margin. " + BATT_NOTE,
    faq: [
      { question: "How long will a UPS last during a power outage?", answer: "Small UPS units run a computer for 5–20 minutes — enough to save work and shut down; larger battery packs run routers for hours." },
      { question: "What size UPS do I need?", answer: "Add up your equipment's watts and choose a UPS with a watt rating at least 25% higher (VA about 1.6 times the watts)." },
    ],
  },
  {
    slug: "battery-pack-calculator",
    title: "Battery Pack Calculator",
    description: "Design a lithium battery pack — how many cells in series and parallel for your target voltage and capacity — with pack watt-hours and weight, for e-bikes, scooters and DIY projects.",
    metaTitle: "Battery Pack Calculator — Series & Parallel Cells",
    metaDescription: "Free battery pack calculator. Find series and parallel cell counts for a target voltage and capacity, plus pack Wh and weight.",
    calcInputs: [
      numberField("targetVoltage", "Target Pack Voltage", { unit: "V", default: 48, max: 1000, step: 1 }),
      numberField("targetAh", "Target Capacity", { unit: "Ah", default: 14, max: 1000, step: 0.5 }),
      numberField("cellVoltage", "Cell Nominal Voltage", { unit: "V", default: 3.6, max: 5, step: 0.05 }),
      numberField("cellMah", "Cell Capacity", { unit: "mAh", default: 3500, max: 50000, step: 50 }),
      numberField("cellGrams", "Cell Weight", { unit: "g", default: 48, max: 2000, step: 1, required: false }),
    ],
    calcResult: { label: "Total Cells", format: "number" },
    calcResults: [
      { key: "totalCells", label: "Total Cells", format: "number", highlight: true },
      { key: "seriesCells", label: "Cells in Series (S)", format: "number" },
      { key: "parallelCells", label: "Cells in Parallel (P)", format: "number" },
      { key: "packVoltage", label: "Pack Nominal Voltage (V)", format: "number" },
      { key: "packAmpHours", label: "Pack Capacity (Ah)", format: "number" },
      { key: "packWattHours", label: "Pack Energy (Wh)", format: "number" },
      { key: "packWeightKg", label: "Pack Weight Incl. BMS & Case (kg, Approx.)", format: "number" },
    ],
    instructions: "Enter the voltage and capacity you need and your cell's nominal voltage and capacity (for example a 21700 cell at 3.6 V, 5,000 mAh or an 18650 at 3,500 mAh).",
    examples: "Example: a 48 V, 14 Ah e-bike pack from 3,500 mAh 18650 cells needs 13S4P — 52 cells — giving 46.8 V, 14 Ah and 655.2 Wh, weighing about 2.87 kg.",
    assumptions: "Series cells set the voltage (S = target ÷ cell voltage); parallel cells set the capacity (P = target Ah ÷ cell Ah). Weight adds about 15% for the BMS, nickel strips and case. Building lithium packs is hazardous — use matched cells, a proper BMS and spot welding.",
    faq: [
      { question: "What does 13S4P mean?", answer: "13 cells in series and 4 in parallel — 52 cells total, giving about 48 V with four cells' worth of capacity." },
      { question: "How many 18650 cells are in a 48V battery?", answer: "Thirteen in series for 48 V nominal, times however many parallel groups you need for capacity." },
    ],
  },
  {
    slug: "portable-power-station-calculator",
    title: "Portable Power Station Calculator",
    description: "Find how long a portable power station will run your devices, how many phone and laptop charges it gives, whether it can handle the load, and solar recharge time.",
    metaTitle: "Portable Power Station Calculator — Runtime",
    metaDescription: "Free portable power station calculator. Find runtime for your devices, phone and laptop charges, output capacity check and solar recharge time.",
    calcInputs: [
      numberField("capacityWh", "Power Station Capacity", { unit: "Wh", default: 1000, max: 50000, step: 10 }),
      numberField("outputWatts", "Rated AC Output", { unit: "W", default: 1500, max: 20000, step: 10 }),
      numberField("loadWatts", "Devices You'll Run", { unit: "W", default: 120, max: 20000, step: 1 }),
      percentField("efficiency", "Inverter Efficiency", { default: 85, max: 100, step: 1 }),
      numberField("solarWatts", "Solar Panel Watts (Optional)", { unit: "W", default: 200, max: 5000, step: 10, required: false }),
    ],
    calcResult: { label: "Runtime", format: "number" },
    calcResults: [
      { key: "runtimeHours", label: "Runtime (Hours)", format: "number", highlight: true },
      { key: "usableWh", label: "Usable Energy (Wh)", format: "number" },
      { key: "phoneCharges", label: "Phone Charges (About 15 Wh Each)", format: "number" },
      { key: "laptopCharges", label: "Laptop Charges (About 60 Wh Each)", format: "number" },
      { key: "canPowerLoad", label: "Can It Power This Load? (1 = Yes)", format: "number" },
      { key: "rechargeHoursSolar", label: "Solar Recharge Time (Sun Hours)", format: "number" },
    ],
    instructions: "Enter the power station's capacity and rated output, the watts of the devices you'll run together, and optionally your solar panel size.",
    examples: "Example: a 1,000 Wh power station running 120 W of devices lasts about 7.08 hours, or charges a phone about 56 times; a 200 W panel recharges it in about 7.14 hours of good sun.",
    assumptions: "Usable energy ≈ capacity × inverter efficiency (DC outputs waste less). Solar panels typically deliver about 70% of their rating in real conditions. Check surge ratings for fridges, pumps and tools. " + BATT_NOTE,
    faq: [
      { question: "How long will a power station run a fridge?", answer: "A typical fridge averages 50–100 W, so a 1,000 Wh station runs it about 8–16 hours." },
      { question: "What size power station do I need?", answer: "Add the watts of your devices and multiply by the hours you need them, then add 20–30% for losses." },
    ],
  },
  {
    slug: "power-bank-calculator",
    title: "Power Bank Calculator",
    description: "Find how many times a power bank will fully charge your phone — allowing for conversion losses — plus its watt-hours and whether it's airline-safe.",
    metaTitle: "Power Bank Calculator — Phone Charges per Bank",
    metaDescription: "Free power bank calculator. Find how many full phone charges a power bank gives, its real capacity at 5 V and airline limits.",
    calcInputs: [
      numberField("bankMah", "Power Bank Capacity", { unit: "mAh", default: 20000, max: 100000, step: 100 }),
      numberField("bankVoltage", "Power Bank Cell Voltage", { unit: "V", default: 3.7, max: 5, step: 0.05 }),
      numberField("phoneMah", "Phone Battery Capacity", { unit: "mAh", default: 4500, max: 20000, step: 50 }),
      percentField("efficiency", "Real-World Efficiency", { default: 65, max: 100, step: 1 }),
    ],
    calcResult: { label: "Full Charges", format: "number" },
    calcResults: [
      { key: "fullCharges", label: "Full Phone Charges", format: "number", highlight: true },
      { key: "bankWattHours", label: "Power Bank Energy (Wh)", format: "number" },
      { key: "deliverableWh", label: "Energy Delivered to the Phone (Wh)", format: "number" },
      { key: "effectiveMahAt5v", label: "Real Output at 5 V (mAh)", format: "number" },
      { key: "airlineOk", label: "Carry-On OK Without Approval? (1 = Yes)", format: "number" },
    ],
    instructions: "Enter the power bank's rated mAh and cell voltage (usually 3.6–3.7 V) and your phone's battery capacity. Efficiency covers voltage conversion and heat losses — 60–70% is typical.",
    examples: "Example: a 20,000 mAh power bank charges a 4,500 mAh phone about 2.78 times — it holds 74 Wh but delivers about 48.1 Wh.",
    assumptions: "Power banks are rated at the 3.6–3.7 V cell voltage; converting to 5–9 V USB output and charging the phone loses 30–40%. Phone energy uses 3.85 V. Banks up to 100 Wh can go in carry-on bags without airline approval; never in checked bags.",
    faq: [
      { question: "How many times will a 10,000 mAh power bank charge my phone?", answer: "About 1.5–2 times for a typical 4,000–5,000 mAh phone." },
      { question: "Why doesn't my power bank deliver its full mAh?", answer: "Its rating is at the internal cell voltage; stepping up to USB voltage and charging the phone wastes about a third of the energy." },
    ],
  },
  {
    slug: "inverter-size-calculator",
    title: "Inverter Size Calculator",
    description: "Find the power inverter size you need — continuous and surge watts for everything you'll run at once — plus the battery current it draws on a 12, 24 or 48 V system.",
    metaTitle: "Inverter Size Calculator — Watts & Surge",
    metaDescription: "Free inverter size calculator. Find the continuous and surge watts your inverter needs and the battery current draw for 12, 24 or 48 V systems.",
    calcInputs: [
      numberField("runningWatts", "Total Running Watts (Everything at Once)", { unit: "W", default: 900, max: 20000, step: 10 }),
      numberField("largestRunning", "Biggest Motor Load — Running Watts", { unit: "W", default: 150, max: 10000, step: 10, required: false }),
      numberField("largestSurge", "Biggest Motor Load — Starting Watts", { unit: "W", default: 450, max: 30000, step: 10, required: false }),
      dropdown("systemVoltage", "Battery System Voltage", [["12 V", 12], ["24 V", 24], ["48 V", 48]], 12),
    ],
    calcResult: { label: "Inverter Size", format: "number" },
    calcResults: [
      { key: "inverterWatts", label: "Inverter Size (Continuous W)", format: "number", highlight: true },
      { key: "continuousNeeded", label: "Continuous Watts Needed (+25%)", format: "number" },
      { key: "surgeNeeded", label: "Surge Watts Needed", format: "number" },
      { key: "batteryAmpsDraw", label: "Battery Current at Full Load (A)", format: "number" },
      { key: "cableSizeHint", label: "Cable Size (1 Light, 2 Heavy — e.g. 2/0 AWG, 3 Very Heavy — Consider Higher Voltage)", format: "number" },
    ],
    instructions: "Add up the running watts of everything you'll use at the same time, then enter the running and starting watts of the biggest motor (fridge, pump, microwave, tools). Choose your battery bank voltage.",
    examples: "Example: 900 W of devices including a fridge that starts at 450 W needs an inverter of at least 1,125 W continuous — a 1,500 W unit — drawing about 83.33 A from a 12 V battery.",
    assumptions: "Continuous rating should be about 25% above your running load; the inverter's surge rating (usually 2× continuous for a few seconds) must cover the biggest motor's start-up. Use pure sine wave inverters for electronics and motors. High currents on 12 V systems need thick, short cables.",
    faq: [
      { question: "What size inverter do I need?", answer: "Add the running watts of everything used at once, add 25%, and make sure the surge rating covers the largest motor starting." },
      { question: "Should I use a 12V or 24V inverter?", answer: "Above about 1,500–2,000 W, 24 V or 48 V systems need much thinner cables and run more efficiently." },
    ],
  },
  {
    slug: "charger-wattage-calculator",
    title: "Charger Wattage Calculator",
    description: "Find the charger wattage your phone, tablet or laptop needs and how long it takes to charge — including fast-charging to 50% — from its battery size and maximum charging power.",
    metaTitle: "Charger Wattage Calculator — What Watt Charger?",
    metaDescription: "Free charger wattage calculator. Find the right USB-C charger wattage for a phone or laptop and estimate full and fast-charge times.",
    calcInputs: [
      numberField("batteryWh", "Device Battery", { unit: "Wh", default: 17, max: 200, step: 0.5 }),
      numberField("deviceMaxWatts", "Device's Maximum Charging Power", { unit: "W", default: 27, max: 240, step: 1 }),
      numberField("chargerWatts", "Charger You Have", { unit: "W", default: 20, max: 240, step: 1 }),
    ],
    calcResult: { label: "Recommended Charger", format: "number" },
    calcResults: [
      { key: "recommendedChargerWatts", label: "Recommended Charger (W)", format: "number", highlight: true },
      { key: "chargeTimeHours", label: "Full Charge Time With Your Charger (Hours)", format: "number" },
      { key: "fastChargeTo50Minutes", label: "Time to 50% (Minutes)", format: "number" },
      { key: "effectiveChargingWatts", label: "Effective Charging Power (W)", format: "number" },
    ],
    instructions: "Enter the device's battery in watt-hours (phones are about 12–20 Wh, laptops 40–100 Wh), the maximum charging power it supports and the charger you have. A bigger charger than the device supports won't charge it faster.",
    examples: "Example: a 17 Wh phone that supports 27 W charging is best with a 30 W charger; on a 20 W charger it reaches 50% in about 30 minutes and full in 1.3 hours.",
    assumptions: "Charging runs near full power to about 80%, then tapers (modelled at 40% power for the last 20%). About 15% is lost as heat. USB-C PD chargers safely supply only what the device asks for.",
    faq: [
      { question: "Can I use a higher-watt charger than my phone needs?", answer: "Yes — USB-C Power Delivery chargers only supply what the device requests, so a 65 W charger is safe for a phone." },
      { question: "What charger wattage does a laptop need?", answer: "Usually 45–100 W; check the laptop's original charger rating and match or exceed it." },
    ],
  },
  {
    slug: "drone-flight-time-calculator",
    title: "Drone Flight Time Calculator",
    description: "Estimate drone flight time from battery capacity and voltage and the drone's average power draw — or its all-up weight — keeping a safe battery reserve.",
    metaTitle: "Drone Flight Time Calculator — Minutes per Battery",
    metaDescription: "Free drone flight time calculator. Estimate flight minutes from battery mAh and voltage and average power or drone weight, with a reserve.",
    calcInputs: [
      numberField("batteryMah", "Battery Capacity", { unit: "mAh", default: 5000, max: 50000, step: 50 }),
      numberField("batteryVoltage", "Battery Voltage (e.g. 4S = 14.8 V)", { unit: "V", default: 15.4, max: 60, step: 0.1 }),
      percentField("usablePercent", "Usable Capacity (Keep a Reserve)", { default: 80, max: 100, step: 5 }),
      numberField("avgWatts", "Average Power Draw (0 = Estimate From Weight)", { unit: "W", default: 0, max: 5000, step: 5, required: false }),
      numberField("weightGrams", "All-Up Weight", { unit: "g", default: 1000, max: 25000, step: 10, required: false }),
    ],
    calcResult: { label: "Flight Time", format: "number" },
    calcResults: [
      { key: "flightMinutes", label: "Flight Time (Minutes)", format: "number", highlight: true },
      { key: "batteryWh", label: "Battery Energy (Wh)", format: "number" },
      { key: "usableWh", label: "Usable Energy (Wh)", format: "number" },
      { key: "averageWatts", label: "Average Power (W)", format: "number" },
    ],
    instructions: "Enter the battery's capacity and voltage and how much to keep in reserve (20% is safe). If you know the drone's average power from logs, enter it; otherwise enter its take-off weight with battery.",
    examples: "Example: a 5,000 mAh 15.4 V battery (77 Wh) on a 1 kg drone with a 20% reserve gives about 21.74 minutes of hover-style flight.",
    assumptions: "Flight time = usable Wh ÷ average watts × 60. Without logged data, power is estimated at about 170 W per kg of all-up weight for efficient quadcopters in gentle flight; aggressive flying, wind and cold cut flight time sharply. " + BATT_NOTE,
    faq: [
      { question: "How long can a drone fly on one battery?", answer: "Consumer camera drones fly about 25–45 minutes; FPV racing drones often 3–8 minutes." },
      { question: "How can I increase drone flight time?", answer: "Fly smoothly, keep the drone light, use efficient props and warm batteries, and avoid strong wind." },
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
