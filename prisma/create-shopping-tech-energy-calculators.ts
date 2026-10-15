// One-time (but safe to re-run) batch setup script: creates 10 home energy and appliance tools
// from the user's shopping list (Shopping Calculators > Electronics, Energy & Tech Calculators).
// See src/lib/calc-engine-shopping-tech-energy.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-tech-energy-calculators.ts
// or
//   npm run db:create-shopping-tech-energy-calculators

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

const RATE_NOTE = "The average US residential electricity price is about 17–18¢ per kWh in 2026, but it ranges from about 11¢ to over 40¢ — use the rate on your bill.";

const TOOLS: ToolDef[] = [
  {
    slug: "electricity-cost-calculator",
    title: "Electricity Cost Calculator",
    description: "Work out your monthly electricity bill from the kWh you use, your energy and delivery rates, fixed charges and taxes — plus the yearly and daily cost.",
    metaTitle: "Electricity Cost Calculator — Monthly Electric Bill",
    metaDescription: "Free electricity cost calculator. Estimate your electric bill from kWh used, energy and delivery rates, fixed charges and tax.",
    calcInputs: [
      numberField("kwhPerMonth", "Electricity Used per Month", { unit: "kWh", default: 860, max: 100000, step: 10 }),
      currencyField("energyRate", "Energy / Supply Rate per kWh", { default: 0.11, max: 2, step: 0.001 }),
      currencyField("deliveryRate", "Delivery / Distribution Rate per kWh", { default: 0.06, max: 2, step: 0.001, required: false }),
      currencyField("fixedCharge", "Fixed Monthly Customer Charge", { default: 12, max: 500, step: 0.5, required: false }),
      percentField("taxRate", "Taxes & Fees", { default: 5, max: 30, step: 0.5, required: false }),
    ],
    calcResult: { label: "Monthly Bill", format: "currency" },
    calcResults: [
      { key: "monthlyBill", label: "Monthly Electric Bill", format: "currency", highlight: true },
      { key: "yearlyCost", label: "Yearly Cost", format: "currency" },
      { key: "dailyCost", label: "Daily Cost", format: "currency" },
      { key: "allInRatePerKwh", label: "All-In Cost per kWh", format: "currency", decimals: 3 },
      { key: "usageCharges", label: "Usage Charges (Before Fixed & Tax)", format: "currency" },
    ],
    instructions: "Enter the kWh you use a month (on your bill or meter) and the rates per kWh — many bills split supply and delivery. Add the fixed customer charge and taxes.",
    examples: "Example: 860 kWh at 11¢ supply and 6¢ delivery, a $12 customer charge and 5% taxes is a $166.11 monthly bill — $1,993.32 a year, or $0.193 per kWh all-in.",
    assumptions: "Bill = (kWh × (supply + delivery) + fixed charge) × (1 + taxes). Time-of-use and tiered rates charge different prices at different times or usage levels. The average US home uses about 860–900 kWh a month. " + RATE_NOTE,
    faq: [
      { question: "How do I calculate my electricity cost?", answer: "Multiply the kWh you use by your price per kWh (supply plus delivery), then add fixed charges and taxes." },
      { question: "How much electricity does a house use?", answer: "The US average is about 860–900 kWh a month, though homes with electric heat or EVs use much more." },
    ],
  },
  {
    slug: "kwh-cost-calculator",
    title: "KWH Cost Calculator",
    description: "Find what you really pay per kilowatt-hour from your electric bill — the all-in rate and the variable rate without fixed charges — and the cost of 1,000 kWh.",
    metaTitle: "kWh Cost Calculator — Real Price per kWh",
    metaDescription: "Free kWh cost calculator. Find your real electricity price per kWh from your bill, with and without fixed charges, and the cost of 1,000 kWh.",
    calcInputs: [
      currencyField("billTotal", "Total Electric Bill", { default: 162.4, max: 100000, step: 0.01 }),
      numberField("kwhUsed", "kWh Used This Bill", { unit: "kWh", default: 860, max: 1000000, step: 1 }),
      currencyField("fixedCharges", "Fixed Charges (Customer / Meter Fees)", { default: 12, max: 1000, step: 0.5, required: false }),
    ],
    calcResult: { label: "All-In Cost per kWh", format: "currency" },
    calcResults: [
      { key: "allInCostPerKwh", label: "All-In Cost per kWh", format: "currency", decimals: 3, highlight: true },
      { key: "variableCostPerKwh", label: "Variable Cost per kWh (Without Fixed Charges)", format: "currency", decimals: 3 },
      { key: "fixedShareOfBill", label: "Fixed Charges as % of Bill", format: "percentage" },
      { key: "costOf1000Kwh", label: "Cost of 1,000 kWh", format: "currency" },
    ],
    instructions: "Enter your bill's total, the kWh used and any fixed monthly charges. Use the variable rate to estimate what an extra appliance or EV charging would add to your bill.",
    examples: "Example: a $162.40 bill for 860 kWh with $12 of fixed charges is $0.189 per kWh all-in, but each extra kWh costs about $0.175.",
    assumptions: "All-in cost = total bill ÷ kWh. Variable cost = (bill − fixed charges) ÷ kWh, which is what added usage costs. " + RATE_NOTE,
    faq: [
      { question: "How do I find my cost per kWh?", answer: "Divide the total bill by the kWh used for an all-in rate; subtract fixed charges first to find what each extra kWh costs." },
      { question: "What is a kWh?", answer: "A kilowatt-hour is 1,000 watts used for one hour — a 100 W bulb running 10 hours uses 1 kWh." },
    ],
  },
  {
    slug: "appliance-running-cost-calculator",
    title: "Appliance Running Cost Calculator",
    description: "Find what any appliance or electronic device costs to run — per hour, day, month and year — from its watts, hours of use and standby power, including TVs.",
    metaTitle: "Appliance Running Cost Calculator — Cost to Run",
    metaDescription: "Free appliance running cost calculator. Find the cost per hour, month and year to run any appliance or TV from watts, use and standby power.",
    calcInputs: [
      numberField("watts", "Power When Running", { unit: "W", default: 120, max: 20000, step: 1 }),
      numberField("hoursPerDay", "Hours Used per Day", { unit: "hours", default: 5, max: 24, step: 0.25 }),
      numberField("standbyWatts", "Standby Power When Off", { unit: "W", default: 1, max: 200, step: 0.5, required: false }),
      currencyField("rate", "Electricity Price per kWh", { default: 0.17, max: 2, step: 0.001 }),
    ],
    calcResult: { label: "Cost per Month", format: "currency" },
    calcResults: [
      { key: "costPerMonth", label: "Cost per Month", format: "currency", highlight: true },
      { key: "costPerHour", label: "Cost per Hour of Use", format: "currency", decimals: 3 },
      { key: "costPerDay", label: "Cost per Day", format: "currency" },
      { key: "costPerYear", label: "Cost per Year", format: "currency" },
      { key: "kwhPerYear", label: "Energy per Year (kWh)", format: "number" },
    ],
    instructions: "Enter the appliance's power in watts (on its label or measured with a plug-in meter), how many hours a day it runs, its standby draw and your electricity price. For a TV, use its typical on-mode watts.",
    examples: "Example: a 120 W TV used 5 hours a day with 1 W standby costs $3.20 a month (225.94 kWh and $38.41 a year) at 17¢ per kWh.",
    assumptions: "Daily kWh = (watts × hours on + standby watts × hours off) ÷ 1,000. Appliances that cycle (fridges, AC, heaters) draw full power only part of the time — use average watts or kWh/year from the EnergyGuide label. " + RATE_NOTE,
    faq: [
      { question: "How do I calculate the cost to run an appliance?", answer: "Multiply watts by hours used, divide by 1,000 for kWh, then multiply by your price per kWh." },
      { question: "How much does it cost to run a TV?", answer: "A modern 55–65 inch LED TV uses about 80–150 W, roughly $2–$5 a month for 5 hours a day." },
    ],
  },
  {
    slug: "appliance-wattage-calculator",
    title: "Appliance Wattage Calculator",
    description: "Find an appliance's wattage from its amps and volts or its EnergyGuide kWh-per-year label — with the start-up surge for motors — for generators, solar and circuit planning.",
    metaTitle: "Appliance Wattage Calculator — Watts From Amps",
    metaDescription: "Free appliance wattage calculator. Find running and starting watts from amps and volts or an EnergyGuide label for generator and solar sizing.",
    calcInputs: [
      dropdown("method", "I Know the", [["Amps and volts (nameplate)", 0], ["kWh per year (EnergyGuide label)", 1], ["Watts", 2]], 0),
      numberField("amps", "Amps", { unit: "A", default: 6, max: 100, step: 0.1, required: false }),
      numberField("volts", "Volts", { unit: "V", default: 120, max: 480, step: 1, required: false }),
      numberField("powerFactor", "Power Factor (Motors ~0.8, Heaters 1)", { default: 1, min: 0.5, max: 1, step: 0.05, required: false }),
      numberField("kwhPerYear", "kWh per Year (Label)", { unit: "kWh", default: 600, max: 20000, step: 10, required: false }),
      numberField("hoursPerDay", "Hours Running per Day (for Label Method)", { unit: "hours", default: 24, max: 24, step: 0.5, required: false }),
      numberField("watts", "Watts", { unit: "W", default: 700, max: 50000, step: 10, required: false }),
      dropdown("motor", "Has a Motor or Compressor?", [["No (lights, electronics, heaters)", 0], ["Small motor (fans, tools)", 1], ["Compressor (fridge, AC, pump)", 2]], 0),
    ],
    calcResult: { label: "Running Watts", format: "number" },
    calcResults: [
      { key: "runningWatts", label: "Running Watts", format: "number", highlight: true },
      { key: "startingWatts", label: "Starting (Surge) Watts", format: "number" },
      { key: "ampsAt120v", label: "Amps at 120 V", format: "number" },
      { key: "kwhPerHour", label: "kWh per Hour of Running", format: "number" },
    ],
    instructions: "Choose what you know. Nameplates often list amps and volts; EnergyGuide labels give kWh per year. Say whether the appliance has a motor or compressor, which draws extra power for a moment when it starts.",
    examples: "Example: a 6 A appliance on 120 V uses about 720 W, or 0.72 kWh per hour of running.",
    assumptions: "Watts = amps × volts × power factor. From a label: average watts = kWh/year × 1,000 ÷ (365 × hours per day). Motors need about 2× and compressors 3× their running watts to start — important for sizing generators and inverters.",
    faq: [
      { question: "How do I convert amps to watts?", answer: "Multiply amps by volts: 10 A × 120 V = 1,200 W (times the power factor for motors)." },
      { question: "What are starting watts?", answer: "The brief surge an appliance with a motor or compressor needs to start — often 2–3 times its running watts." },
    ],
  },
  {
    slug: "space-heater-cost-calculator",
    title: "Space Heater Cost Calculator",
    description: "Work out what a space heater costs to run per hour, day, month and heating season — on high or low, allowing for the thermostat cycling it on and off.",
    metaTitle: "Space Heater Cost Calculator — Cost to Run",
    metaDescription: "Free space heater cost calculator. Find the hourly, monthly and seasonal cost to run a space heater on high or low with thermostat cycling.",
    calcInputs: [
      numberField("watts", "Heater Wattage (High)", { unit: "W", default: 1500, max: 5000, step: 50 }),
      dropdown("setting", "Setting", [["High", 0], ["Low (about half)", 1]], 0),
      percentField("dutyCycle", "Share of Time Actually Heating (Thermostat)", { default: 70, max: 100, step: 5 }),
      numberField("hoursPerDay", "Hours On per Day", { unit: "hours", default: 6, max: 24, step: 0.5 }),
      numberField("months", "Months of Use per Season", { default: 4, max: 12, step: 0.5, required: false }),
      currencyField("rate", "Electricity Price per kWh", { default: 0.17, max: 2, step: 0.001 }),
    ],
    calcResult: { label: "Cost per Month", format: "currency" },
    calcResults: [
      { key: "costPerMonth", label: "Cost per Month", format: "currency", highlight: true },
      { key: "costPerHour", label: "Cost per Hour", format: "currency", decimals: 3 },
      { key: "costPerDay", label: "Cost per Day", format: "currency" },
      { key: "costPerSeason", label: "Cost per Heating Season", format: "currency" },
      { key: "kwhPerMonth", label: "Energy per Month (kWh)", format: "number" },
    ],
    instructions: "Enter the heater's wattage and setting, how much of the time its thermostat keeps it heating, the hours it's on and your electricity price.",
    examples: "Example: a 1,500 W heater on high, heating 70% of the time for 6 hours a day, costs about $0.18 an hour and $32.58 a month — $130.32 over a 4-month season at 17¢ per kWh.",
    assumptions: "Cost = kW × share of time heating × hours × rate. All resistance heaters turn 100% of electricity into heat; heating one room with a space heater can be cheaper than heating the whole house, but heat pumps deliver 2–4× more heat per kWh. " + RATE_NOTE,
    faq: [
      { question: "How much does it cost to run a space heater?", answer: "A 1,500 W heater costs about 25 cents an hour at 17¢ per kWh — roughly $30–$45 a month at 6 hours a day." },
      { question: "Is a space heater cheaper than central heat?", answer: "It can be if you only heat one room and turn the thermostat down elsewhere; heating a whole house with space heaters is usually more expensive." },
    ],
  },
  {
    slug: "light-bulb-cost-calculator",
    title: "Light Bulb Cost Calculator",
    description: "Compare old incandescent or halogen bulbs with LEDs — yearly energy and replacement costs, savings, payback and 10-year savings — for one room or the whole house.",
    metaTitle: "Light Bulb Cost Calculator — LED Savings & Payback",
    metaDescription: "Free light bulb cost calculator. Compare incandescent and LED running costs, yearly savings, payback time and LED return on investment.",
    calcInputs: [
      numberField("bulbs", "Number of Bulbs", { default: 20, max: 10000 }),
      numberField("hoursPerDay", "Hours On per Day", { unit: "hours", default: 4, max: 24, step: 0.5 }),
      currencyField("rate", "Electricity Price per kWh", { default: 0.17, max: 2, step: 0.001 }),
      numberField("oldWatts", "Old Bulb Watts", { unit: "W", default: 60, max: 500 }),
      currencyField("oldPrice", "Old Bulb Price", { default: 1.5, max: 100, step: 0.05, required: false }),
      numberField("oldLife", "Old Bulb Life", { unit: "hours", default: 1000, max: 100000, step: 100, required: false }),
      numberField("ledWatts", "LED Watts", { unit: "W", default: 9, max: 200 }),
      currencyField("ledPrice", "LED Price", { default: 3, max: 100, step: 0.05 }),
      numberField("ledLife", "LED Life", { unit: "hours", default: 15000, max: 100000, step: 500 }),
    ],
    calcResult: { label: "Yearly Savings", format: "currency" },
    calcResults: [
      { key: "yearlySavings", label: "Yearly Savings With LEDs", format: "currency", highlight: true },
      { key: "oldBulbsYearlyCost", label: "Old Bulbs — Yearly Cost (Energy + Replacements)", format: "currency" },
      { key: "ledYearlyCost", label: "LEDs — Yearly Cost", format: "currency" },
      { key: "upfrontLedCost", label: "Upfront Cost of LEDs", format: "currency" },
      { key: "paybackMonths", label: "Payback Time (Months)", format: "number" },
      { key: "tenYearSavings", label: "10-Year Savings", format: "currency" },
    ],
    instructions: "Enter how many bulbs you're switching and how long they're on each day, then the wattage, price and rated life of the old bulbs and the LEDs. A 60 W incandescent is replaced by an 8–10 W LED.",
    examples: "Example: replacing twenty 60 W bulbs used 4 hours a day with 9 W LEDs saves about $291.12 a year at 17¢ per kWh. The $60.00 of LEDs pays back in about 2.47 months.",
    assumptions: "Yearly cost = energy (watts × hours ÷ 1,000 × rate) + bulbs replaced (hours ÷ rated life × price). LEDs use about 85% less energy and last 15–25 times longer than incandescents. For commercial retrofits (LED ROI), include fixture and labor costs in the LED price.",
    faq: [
      { question: "How much do LED bulbs save?", answer: "About $5–$10 per bulb per year compared with incandescents, depending on use and electricity price." },
      { question: "What LED replaces a 60 watt bulb?", answer: "An LED of about 800 lumens, usually 8–10 watts." },
    ],
  },
  {
    slug: "smart-thermostat-savings-calculator",
    title: "Smart Thermostat Savings Calculator",
    description: "Estimate how much a smart or programmable thermostat saves by setting the temperature back at night and while you're out — on heating and cooling — and its payback.",
    metaTitle: "Smart Thermostat Savings Calculator — Payback",
    metaDescription: "Free smart thermostat savings calculator. Estimate heating and cooling savings from setbacks, total yearly savings and payback time.",
    calcInputs: [
      currencyField("heatingBill", "Yearly Heating Cost", { default: 1100, max: 100000, step: 10 }),
      currencyField("coolingBill", "Yearly Cooling Cost", { default: 700, max: 100000, step: 10 }),
      numberField("winterSetback", "Winter Setback (Degrees Lower)", { unit: "°F", default: 7, max: 15 }),
      numberField("summerSetup", "Summer Setup (Degrees Higher)", { unit: "°F", default: 4, max: 15 }),
      numberField("setbackHours", "Hours of Setback per Day", { unit: "hours", default: 8, max: 20, step: 0.5 }),
      currencyField("thermostatCost", "Thermostat Price (Installed)", { default: 200, max: 2000, step: 5 }),
      currencyField("rebate", "Utility Rebate", { default: 50, max: 1000, step: 5, required: false }),
    ],
    calcResult: { label: "Yearly Savings", format: "currency" },
    calcResults: [
      { key: "yearlySavings", label: "Yearly Savings", format: "currency", highlight: true },
      { key: "heatingSavings", label: "Heating Savings", format: "currency" },
      { key: "coolingSavings", label: "Cooling Savings", format: "currency" },
      { key: "savingsPercent", label: "Savings as % of Heating & Cooling", format: "percentage" },
      { key: "paybackMonths", label: "Payback Time (Months)", format: "number" },
    ],
    instructions: "Enter what you spend a year on heating and cooling, how many degrees you'll set back in winter and up in summer, and for how many hours a day (sleeping and away). Add the thermostat price and any utility rebate.",
    examples: "Example: a 7°F winter setback and 4°F summer setup for 8 hours a day on $1,100 of heating and $700 of cooling saves about $105.00 a year, paying back a $200 thermostat (after a $50 rebate) in 17.14 months.",
    assumptions: "Uses the DOE rule of thumb: about 1% savings per °F of setback for each 8 hours, capped at 15%. Savings are smaller with heat pumps (use small setbacks to avoid backup heat) and in mild climates. Smart thermostats also save by learning schedules and detecting when you're away.",
    faq: [
      { question: "How much does a smart thermostat save?", answer: "Typically 5–12% on heating and cooling — often $100–$200 a year for an average home." },
      { question: "Should I set back the temperature with a heat pump?", answer: "Use small setbacks (2–3°F) so the backup electric heat doesn't kick in during recovery." },
    ],
  },
  {
    slug: "gas-bill-calculator",
    title: "Gas Bill Calculator",
    description: "Estimate your natural gas bill from therms or CCF used, your supply and delivery rates per therm, the fixed customer charge and taxes.",
    metaTitle: "Gas Bill Calculator — Therms & CCF",
    metaDescription: "Free gas bill calculator. Estimate your natural gas bill from therms or CCF, supply and delivery rates, fixed charges and taxes.",
    calcInputs: [
      numberField("usage", "Gas Used This Month", { default: 85, max: 100000, step: 1 }),
      dropdown("unit", "Usage In", [["Therms", 0], ["CCF (hundred cubic feet)", 1]], 0),
      currencyField("supplyRate", "Supply Rate per Therm", { default: 0.75, max: 10, step: 0.01 }),
      currencyField("deliveryRate", "Delivery Rate per Therm", { default: 0.65, max: 10, step: 0.01, required: false }),
      currencyField("fixedCharge", "Fixed Customer Charge", { default: 15, max: 500, step: 0.5, required: false }),
      percentField("taxRate", "Taxes & Fees", { default: 6, max: 30, step: 0.5, required: false }),
    ],
    calcResult: { label: "Monthly Gas Bill", format: "currency" },
    calcResults: [
      { key: "monthlyBill", label: "Monthly Gas Bill", format: "currency", highlight: true },
      { key: "therms", label: "Therms", format: "number" },
      { key: "usageCharges", label: "Usage Charges", format: "currency" },
      { key: "allInCostPerTherm", label: "All-In Cost per Therm", format: "currency" },
      { key: "costPerYearAtThisMonth", label: "Yearly Cost at This Rate", format: "currency" },
    ],
    instructions: "Enter the gas used (therms or CCF from your bill or meter), the supply and delivery rates per therm and the fixed customer charge and taxes.",
    examples: "Example: 85 therms at 75¢ supply and 65¢ delivery with a $15 customer charge and 6% taxes is a $142.04 bill — $1.67 per therm all-in.",
    assumptions: "1 CCF of natural gas ≈ 1.037 therms (about 103,700 BTU). Winter bills are often 3–5 times summer bills in homes with gas heat. Rates change with wholesale prices and season.",
    faq: [
      { question: "What is a therm?", answer: "A unit of heat energy equal to 100,000 BTU — roughly the energy in 100 cubic feet of natural gas." },
      { question: "How much natural gas does a house use?", answer: "Homes with gas heat often use 50–150 therms a month in winter and 15–30 in summer." },
    ],
  },
  {
    slug: "refrigerator-size-calculator",
    title: "Refrigerator Size Calculator",
    description: "Find the refrigerator capacity your household needs in cubic feet — based on people and how much you cook — and the largest fridge that fits your space.",
    metaTitle: "Refrigerator Size Calculator — Cubic Feet & Fit",
    metaDescription: "Free refrigerator size calculator. Find the cubic feet your household needs and the maximum fridge width and height for your opening.",
    calcInputs: [
      numberField("people", "People in the Home", { default: 4, min: 1, max: 12 }),
      dropdown("cooking", "How Much You Cook at Home", [["Eat out often", 0], ["Average", 1], ["Cook most meals / buy in bulk", 2]], 1),
      numberField("openingWidth", "Opening Width", { unit: "in", default: 36, max: 72, step: 0.25, required: false }),
      numberField("openingHeight", "Opening Height", { unit: "in", default: 70, max: 96, step: 0.25, required: false }),
    ],
    calcResult: { label: "Recommended Capacity", format: "number" },
    calcResults: [
      { key: "recommendedCuFt", label: "Recommended Capacity (cu ft)", format: "number", highlight: true },
      { key: "rangeLow", label: "Range From (cu ft)", format: "number" },
      { key: "rangeHigh", label: "Range To (cu ft)", format: "number" },
      { key: "maxFridgeWidth", label: "Max Fridge Width for Your Opening (in)", format: "number" },
      { key: "maxFridgeHeight", label: "Max Fridge Height (in)", format: "number" },
      { key: "typeCode", label: "Likely Type (1 Narrow/Top-Freezer, 2 Standard, 3 French Door / Side-by-Side)", format: "number" },
    ],
    instructions: "Enter how many people live with you and how much you cook. Measure the fridge opening's width and height — leave about 1 inch of air gap at the sides and top (and room for the doors to swing open).",
    examples: "Example: a family of four that cooks an average amount needs about 28 cu ft (25–31); a 36 in opening fits a fridge up to 35 in wide.",
    assumptions: "Rule of thumb: about 8 cu ft plus 4–6 cu ft per person. Standard full-size fridges are 30–36 in wide; counter-depth models are shallower but hold less. Check door swing clearance and hallway widths for delivery.",
    faq: [
      { question: "What size refrigerator does a family of 4 need?", answer: "Around 25–30 cubic feet total, depending on how much you cook and stock." },
      { question: "How much space should be around a refrigerator?", answer: "About 1 inch at the top, 1/8–1/2 inch at the sides and 1–2 inches behind for airflow, unless the manual says otherwise." },
    ],
  },
  {
    slug: "freezer-size-calculator",
    title: "Freezer Size Calculator",
    description: "Find the freezer size you need in cubic feet from household size and how much you stock — including bulk meat or hunting — with food capacity and chest vs upright advice.",
    metaTitle: "Freezer Size Calculator — Cubic Feet Needed",
    metaDescription: "Free freezer size calculator. Find the chest or upright freezer capacity you need from household size, stocking habits and bulk meat.",
    calcInputs: [
      numberField("people", "People in the Home", { default: 4, min: 1, max: 12 }),
      dropdown("stocking", "How You Stock", [["Light (a few weeks)", 0], ["Normal", 1], ["Bulk buying / garden", 2]], 1),
      numberField("extraLbs", "Extra Bulk Meat or Game", { unit: "lb", default: 100, max: 2000, step: 10, required: false }),
    ],
    calcResult: { label: "Recommended Capacity", format: "number" },
    calcResults: [
      { key: "recommendedCuFt", label: "Recommended Freezer Capacity (cu ft)", format: "number", highlight: true },
      { key: "foodCapacityLbs", label: "Food It Holds (lb, Approx.)", format: "number" },
      { key: "chestOrUprightCode", label: "Suggested Type (1 Chest Freezer, 2 Upright Freezer)", format: "number" },
      { key: "estimatedYearlyKwh", label: "Estimated Energy Use (kWh/Year)", format: "number" },
    ],
    instructions: "Enter household size and how much you like to keep frozen, plus any bulk purchase such as a quarter of beef or a deer.",
    examples: "Example: a family of four with normal stocking plus 100 lb of bulk meat needs about 12.86 cu ft — room for roughly 450 lb of food.",
    assumptions: "About 1.5–4 cu ft per person by stocking style; 1 cu ft holds about 35 lb of frozen food. A quarter of beef (about 100–120 lb of meat) needs about 4 cu ft. Chest freezers hold more and use less energy; uprights are easier to organize.",
    faq: [
      { question: "What size freezer do I need for a quarter of beef?", answer: "About 4–5 cubic feet of free space for a quarter (roughly 100–120 lb of cuts)." },
      { question: "Chest or upright freezer?", answer: "Chest freezers are cheaper, more efficient and hold more; uprights save floor space and are easier to keep organized." },
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
