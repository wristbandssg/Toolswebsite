// One-time (but safe to re-run) batch setup script: creates 44 energy, solar & electrical calculators
// (Business & Industrial Calculators > Energy, Solar & Electrical Calculators). Formulas and data tables
// live in src/lib/calc-engine-biz-energy.ts; examples are computed from the engine. Merged keywords (no
// separate page): Scope 3 Calculator → scope-3-emissions; BP Carbon Footprint, Carbon Footprint for
// Industry → business-carbon-footprint; Home Battery Backup, Tesla Powerwall → solar-battery; RV Solar →
// off-grid-solar; Solar Wire Size, Current Capacity → wire-size; MVA → three-phase-power; Load Calculator
// Electrical, Service Calculator → electrical-load; Commercial Electrical Installation → electrical-
// installation-cost; Sub Meter Reading, Submeter → sub-meter; MCF, Gas Conversion → natural-gas.
// The four state solar pages differ by state net-metering rules, incentives, sun hours and prices.
//
// HOW TO RUN (after prisma/setup-business-industrial-category.ts --apply)
//   npx tsx prisma/create-biz-energy-calculators.ts
// or
//   npm run db:create-biz-energy-calculators

import * as E from "../src/lib/calc-engine-biz-energy";
import { hgMovedCategoryId } from "./setup-house-garden-category";

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function numberField(key: string, label: string, opts: { unit?: string; default?: number; min?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "number", unit: opts.unit, required: true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 1000, step: opts.step ?? 1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "currency", required: true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000, step: opts.step ?? 1 };
}

function percentField(key: string, label: string, opts: { default?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "percentage", unit: "%", required: true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100, step: opts.step ?? 0.5 };
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

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { maximumFractionDigits: d });
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const YESNO: [string, number][] = [["No", 0], ["Yes", 1]];
const yn = (key: string, label: string, def = 0) => dropdown(key, label, YESNO, def);
const opts = (labels: string[]) => labels.map((l, i) => [l, i] as [string, number]);
const cur = (key: string, label: string, def: number, max = 10000000, step = 1) => currencyField(key, label, { default: def, max, step });
const num = (key: string, label: string, def: number, max = 100000, step = 1, min = 0) => numberField(key, label, { default: def, max, step, min });
const pct = (key: string, label: string, def: number, max = 100, step = 0.1) => percentField(key, label, { default: def, max, step });
const FMT = { c: "currency", n: "number", p: "percentage", d: "date" } as const;
type Line = [key: string, label: string, fmt: keyof typeof FMT];

interface Spec { slug: string; title: string; desc: string; meta?: string; inputs: Record<string, unknown>[]; results: Line[]; fn: E.CustomCalculator; ex: Record<string, number>; exText: (o: Record<string, number>) => string; how: string; assume: string; faq: [string, string][]; currency?: string }
function mk(s: Spec): ToolDef {
  const o = r(s.fn, s.ex);
  const [, mainLabel, mainFmt] = s.results[0];
  const c = s.currency ? { currency: s.currency } : {};
  return {
    slug: s.slug,
    title: s.title,
    description: s.desc,
    metaTitle: (s.meta ?? `${s.title} — Free Online Estimator`).slice(0, 70),
    metaDescription: s.desc.length > 158 ? `${s.desc.slice(0, 155).replace(/\s+\S*$/, "")}…` : s.desc,
    calcInputs: s.inputs,
    calcResult: { label: mainLabel, format: FMT[mainFmt], ...(mainFmt === "c" ? c : {}) },
    calcResults: s.results.map(([key, label, f], i) => ({ key, label, format: FMT[f], ...(f === "c" ? c : {}), ...(i === 0 ? { highlight: true } : {}) })),
    instructions: s.how,
    examples: s.exText(o),
    assumptions: `${s.assume} ${NOTE}`,
    faq: s.faq.map(([question, answer]) => ({ question, answer })),
  };
}

const CAT = "energy-solar-electrical-calculators";
const NOTE = "Results are engineering and budgeting estimates — electrical work must follow the NEC and local code and be designed or checked by a licensed professional, and energy prices and incentives change.";

const dateField = (key: string, label: string, def: number | string = "today") => ({ key, label, type: "date", required: true, default: def });
const region = pct("regionAdjust", "Local Price Adjustment (+/− %)", 0, 100, 1);
const PSH = (def = 4.5) => num("sunHours", "Peak Sun Hours per Day (annual avg.)", def, 8, 0.1, 1);
const ORIENT = dropdown("orientation", "Roof Direction", opts(["South", "Southeast / Southwest", "East / West", "North"]), 0);
const WIRE_LABELS = E.WIRES.map(([c]) => (c >= 250 ? `${c} kcmil` : c > 0 ? `${c} AWG` : `${1 - c}/0 AWG`));
const CLIMATE = dropdown("climate", "Climate", opts(["Mild (South / Pacific)", "Moderate (Mid-Atlantic, Midwest south)", "Cold (Northeast, Upper Midwest)", "Very cold (Northern tier, Alaska)"]), 1);
const STATE_INPUTS = (cpw: number, rate: number, self: number, fed = 0) => [num("monthlyKwh", "Average Monthly Electricity Use (kWh)", 1000, 10000, 10), num("systemKwOverride", "System Size Override (kW, 0 = size to usage)", 0, 100, 0.1), cur("costPerWatt", `Installed Cost per Watt (0 = state avg ~$${cpw})`, 0, 10, 0.01), cur("utilityRate", `Electricity Rate per kWh (0 = state avg ~$${rate})`, 0, 1, 0.005), pct("selfConsumption", "Solar Used On-Site (not exported)", self, 100, 1), dropdown("exportRule", "Export Credit", opts(["State default rule", "Custom % of retail"]), 0), pct("exportCreditShare", "Custom Export Credit (% of retail)", 50, 100, 1), pct("federalCredit", "Federal Tax Credit % (0 for purchases after 2025)", fed, 30, 1), cur("utilityRebate", "Utility / Local Rebate", 0, 100000, 50)];
const STATE_RESULTS: Line[] = [["netCost", "Net Cost After Incentives", "c"], ["systemSizeKw", "System Size (kW)", "n"], ["grossCost", "Gross Installed Cost", "c"], ["federalCredit", "Federal Credit", "c"], ["stateIncentives", "State Incentives", "c"], ["annualProductionKwh", "Annual Production (kWh)", "n"], ["firstYearSavings", "First-Year Savings", "c"], ["paybackYears", "Payback (years)", "n"], ["twentyFiveYearSavings", "25-Year Net Savings", "c"]];
const stateEx = { monthlyKwh: 1000, systemKwOverride: 0, costPerWatt: 0, utilityRate: 0, selfConsumption: 50, exportRule: 0, exportCreditShare: 50, federalCredit: 0, utilityRebate: 0 };

const TOOLS: ToolDef[] = [
  mk({
    slug: "scope-3-emissions-calculator", title: "Scope 3 Emissions Calculator",
    desc: "Estimate Scope 3 value-chain emissions with spend-based factors — purchased goods, capital goods, transport, waste, business travel, employee commuting and use of sold products.",
    meta: "Scope 3 Emissions Calculator — Spend-Based Estimate",
    inputs: [...E.SCOPE3.map(([n, f], i) => cur(`spend${i}`, `${n} — Annual Spend (${f} kg/$)`, [2000000, 500000, 300000, 40000, 150000, 200000][i], 10000000000, 1000)), num("employees", "Employees", 120, 1000000), num("commuteMilesPerDay", "Average Commute (miles per day, round trip)", 24, 300, 1), num("workDays", "Work Days per Year", 230, 365), pct("remoteShare", "Remote Work Share", 20, 100, 1), num("unitsSold", "Energy-Using Products Sold per Year", 0, 100000000), num("lifetimeKwhPerUnit", "Lifetime kWh per Product", 0, 1000000, 1), num("gridFactor", "Grid Factor (kg CO2e/kWh)", 0.37, 1.5, 0.01)],
    results: [["totalTonnes", "Total Scope 3 (t CO2e)", "n"], ["purchasedGoodsT", "Cat 1 Purchased Goods", "n"], ["capitalGoodsT", "Cat 2 Capital Goods", "n"], ["upstreamTransportT", "Cat 4 Upstream Transport", "n"], ["wasteT", "Cat 5 Waste", "n"], ["businessTravelT", "Cat 6 Business Travel", "n"], ["employeeCommutingT", "Cat 7 Employee Commuting", "n"], ["downstreamTransportT", "Cat 9 Downstream Transport", "n"], ["useOfSoldProductsT", "Cat 11 Use of Sold Products", "n"]],
    fn: E.scope3, ex: { spend0: 2000000, spend1: 500000, spend2: 300000, spend3: 40000, spend4: 150000, spend5: 200000, employees: 120, commuteMilesPerDay: 24, workDays: 230, remoteShare: 20, unitsSold: 0, lifetimeKwhPerUnit: 0, gridFactor: 0.37 },
    exText: (o) => `Example: a company spending $2M on goods and $3.2M overall in these categories with 120 commuting staff has roughly ${fmt(o.totalTonnes, 0)} t CO2e of Scope 3 emissions — ${fmt(o.purchasedGoodsT, 0)} t from purchased goods alone.`,
    how: "Enter annual spend in each GHG Protocol category from your accounts, plus headcount and commuting. Replace spend-based factors with supplier data as it becomes available.",
    assume: "Spend-based factors are typical US EEIO averages (kg CO2e per dollar); commuting at 0.17 kg CO2e per passenger-km by car. Spend-based results are screening-level (±50%).",
    faq: [["What are Scope 3 emissions?", "Indirect emissions in a company's value chain — suppliers, transport, travel, product use and disposal."], ["What's the easiest way to estimate Scope 3?", "Start spend-based: multiply spend in each category by an EEIO emission factor, then refine your biggest categories."]],
  }),
  mk({
    slug: "embodied-carbon-calculator", title: "Embodied Carbon Calculator",
    desc: "Estimate the embodied carbon (A1–A3) of a building's main materials — concrete, rebar, steel, aluminum, timber, gypsum, glass, brick and insulation — in tonnes CO2e and kg per sq ft.",
    inputs: [...[1, 2, 3, 4, 5].flatMap((i) => [dropdown(`material${i}`, `Material ${i}`, opts(E.EMBODIED.map(([n, f]) => `${n} — ${f} t`)), [0, 1, 2, 4, 6][i - 1]), num(`qty${i}`, `Material ${i} Quantity (units above)`, [400, 30, 60, 80, 40][i - 1], 10000000, 0.1)]), num("buildingArea", "Building Floor Area (sq ft)", 20000, 100000000, 10)],
    results: [["totalTonnesCo2e", "Total Embodied Carbon (t CO2e)", "n"], ["kgPerSqFt", "kg CO2e per sq ft", "n"], ["kgPerSqM", "kg CO2e per m²", "n"], ["carsPerYearEquivalent", "Equivalent Cars Driven for a Year", "n"], ["line1T", "Material 1 (t)", "n"], ["line2T", "Material 2 (t)", "n"], ["line3T", "Material 3 (t)", "n"], ["line4T", "Material 4 (t)", "n"], ["line5T", "Material 5 (t)", "n"]],
    fn: E.embodiedCarbon, ex: { material1: 0, qty1: 400, material2: 1, qty2: 30, material3: 2, qty3: 60, material4: 4, qty4: 80, material5: 6, qty5: 40, buildingArea: 20000 },
    exText: (o) => `Example: 400 yd³ of concrete, 30 tons of rebar, 60 tons of steel, 80,000 bf of lumber and 40,000 sq ft of drywall total about ${fmt(o.totalTonnesCo2e, 0)} t CO2e — ${o.kgPerSqFt} kg per sq ft for a 20,000 sq ft building.`,
    how: "Choose up to five materials and enter quantities in the units shown. Use product EPDs for more precise factors.",
    assume: "Factors are cradle-to-gate (A1–A3) industry averages from EPDs; low-carbon concrete mixes and recycled steel can cut these 20–50%.",
    faq: [["What is embodied carbon?", "Emissions from making, transporting and installing building materials — as opposed to operational carbon from running the building."]],
  }),
  mk({
    slug: "tree-carbon-offset-calculator", title: "Tree Carbon Offset Calculator",
    desc: "Work out how many trees a company needs to plant to offset its emissions over a chosen period — with survival rate, planting cost, cost per tonne and forest area.",
    meta: "Tree Carbon Offset Calculator — Trees to Offset CO2",
    inputs: [num("annualTonnes", "Emissions to Offset per Year (t CO2e)", 100, 10000000, 0.1), num("years", "Offset Period (years)", 20, 100, 1, 1), num("kgPerTreeYear", "CO2 Absorbed per Tree per Year (kg)", 22, 100, 0.5, 1), pct("survival", "Tree Survival Rate", 80, 100, 1), cur("costPerTree", "Cost per Tree Planted", 1.5, 100, 0.05), num("treesPerAcre", "Trees per Acre", 450, 2000, 10, 50)],
    results: [["treesNeeded", "Trees to Plant", "n"], ["totalTonnesToOffset", "Total Emissions Offset (t)", "n"], ["plantingCost", "Planting Cost", "c"], ["costPerTonne", "Cost per Tonne", "c"], ["acresOfForest", "Forest Area (acres)", "n"]],
    fn: E.treeOffset, ex: { annualTonnes: 100, years: 20, kgPerTreeYear: 22, survival: 80, costPerTree: 1.5, treesPerAcre: 450 },
    exText: (o) => `Example: offsetting 100 t CO2e a year for 20 years at 22 kg per tree per year (80% survival) takes about ${fmt(o.treesNeeded, 0)} trees — roughly ${usd(o.plantingCost)} and ${o.acresOfForest} acres.`,
    how: "Enter your annual emissions, how many years the trees should cover, and the planting partner's price per tree.",
    assume: "A typical mature temperate tree absorbs ~22 kg CO2 a year; young trees absorb much less for the first decade, so tree offsets deliver slowly. Verified carbon credits are a separate, audited product.",
    faq: [["How many trees offset one tonne of CO2?", "About 45 trees absorbing 22 kg each for a year, or one tree over roughly 45 years."]],
  }),
  mk({
    slug: "business-carbon-footprint-calculator", title: "Business Carbon Footprint Calculator",
    desc: "Calculate a company's Scope 1 and 2 carbon footprint from fuel, refrigerant and electricity use — plus business travel — with tonnes per employee, per $1M revenue and offset cost.",
    meta: "Company Carbon Footprint Calculator — Scope 1 & 2",
    inputs: [num("electricityKwh", "Electricity (kWh per year)", 250000, 10000000000, 100), num("gridFactor", "Grid Factor (kg CO2e/kWh)", 0.37, 1.5, 0.01), pct("renewableShare", "Renewable Electricity Share (RECs / PPA)", 0, 100, 1), num("naturalGasTherms", "Natural Gas (therms)", 8000, 1000000000, 10), num("dieselGal", "Diesel (gal)", 3000, 100000000, 10), num("gasolineGal", "Gasoline (gal)", 6000, 100000000, 10), num("propaneGal", "Propane (gal)", 0, 100000000, 10), num("fuelOilGal", "Heating Oil (gal)", 0, 100000000, 10), num("refrigerantKg", "Refrigerant Leaked (kg)", 2, 100000, 0.1), num("refrigerantGwp", "Refrigerant GWP (R-410A = 2,088)", 2088, 15000, 1), num("airMiles", "Business Air Travel (passenger miles)", 150000, 1000000000, 100), num("hotelNights", "Hotel Nights", 200, 10000000), num("employees", "Employees", 50, 10000000), cur("revenue", "Annual Revenue", 15000000, 1000000000000, 1000), cur("offsetPrice", "Offset Price per Tonne", 15, 500, 0.5)],
    results: [["totalTonnes", "Total Footprint (t CO2e)", "n"], ["scope1Tonnes", "Scope 1 (fuels, refrigerants)", "n"], ["scope2Tonnes", "Scope 2 (electricity)", "n"], ["travelTonnes", "Business Travel (Scope 3)", "n"], ["perEmployeeTonnes", "Tonnes per Employee", "n"], ["perMillionRevenue", "Tonnes per $1M Revenue", "n"], ["offsetCost", "Cost to Offset", "c"]],
    fn: E.businessFootprint, ex: { electricityKwh: 250000, gridFactor: 0.37, renewableShare: 0, naturalGasTherms: 8000, dieselGal: 3000, gasolineGal: 6000, propaneGal: 0, fuelOilGal: 0, refrigerantKg: 2, refrigerantGwp: 2088, airMiles: 150000, hotelNights: 200, employees: 50, revenue: 15000000, offsetPrice: 15 },
    exText: (o) => `Example: a 50-person firm using 250,000 kWh, 8,000 therms and 9,000 gallons of vehicle fuel emits about ${o.totalTonnes} t CO2e (${o.perEmployeeTonnes} t per employee); offsetting it costs about ${usd(o.offsetCost)}.`,
    how: "Pull a year of utility bills, fuel card totals, refrigerant service logs and travel reports, then enter the totals.",
    assume: "EPA emission factors: natural gas 5.3 kg/therm, diesel 10.21 kg/gal, gasoline 8.78, propane 5.72, heating oil 10.3; air travel ~0.2 kg per passenger mile. Location-based Scope 2 uses the grid factor; renewable share reduces it (market-based).",
    faq: [["How do I calculate my company's carbon footprint?", "Multiply each fuel and electricity quantity by its emission factor, then add refrigerant leaks × GWP and any travel."]],
  }),
  mk({
    slug: "solar-panel-size-calculator", title: "Solar Panel Size Calculator",
    desc: "Size a solar system from your electricity use — system kW, number of panels, roof area, annual production, bill offset and estimated cost.",
    meta: "Solar Power Calculator — System Size & Panels Needed",
    inputs: [dropdown("usageMode", "Usage Entered As", opts(["Monthly kWh", "Annual kWh"]), 0), num("monthlyKwh", "Average Monthly Use (kWh)", 900, 100000, 10), num("annualKwh", "Annual Use (kWh)", 10800, 10000000, 100), pct("offset", "Target Bill Offset", 100, 150, 1), PSH(4.5), ORIENT, pct("losses", "System Losses", 14, 40, 0.5), num("panelWatts", "Panel Wattage", 400, 700, 5, 100), cur("costPerWatt", "Installed Cost per Watt", 2.9, 10, 0.01)],
    results: [["systemSizeKw", "System Size (kW DC)", "n"], ["panelsNeeded", "Panels Needed", "n"], ["roofAreaSqFt", "Roof Area (sq ft)", "n"], ["annualProductionKwh", "Annual Production (kWh)", "n"], ["offsetPercent", "Bill Offset", "p"], ["estimatedCost", "Estimated Installed Cost", "c"]],
    fn: E.solarSize, ex: { usageMode: 0, monthlyKwh: 900, annualKwh: 10800, offset: 100, sunHours: 4.5, orientation: 0, losses: 14, panelWatts: 400, costPerWatt: 2.9 },
    exText: (o) => `Example: using 900 kWh a month with 4.5 sun hours needs a ${o.systemSizeKw} kW system — ${o.panelsNeeded} panels of 400 W on about ${fmt(o.roofAreaSqFt, 0)} sq ft of roof, roughly ${usd(o.estimatedCost)} before incentives.`,
    how: "Enter your usage from your utility bills (12-month average is best), your area's peak sun hours and the panel you're considering.",
    assume: "kW = annual kWh ÷ (365 × sun hours × (1 − losses) × orientation). Each panel takes about 18.5 sq ft including spacing. Typical US peak sun hours: 3.5 (Northeast) to 6 (Southwest).",
    faq: [["How many solar panels do I need?", "Divide annual use by (sun hours × 365 × 0.86) to get kW, then by panel wattage — about 20–25 panels for a typical US home."]],
  }),
  mk({
    slug: "pvwatts-solar-calculator", title: "PVWatts-Style Solar Production Calculator",
    desc: "Estimate annual and monthly solar output from system size, sun hours, tilt, roof direction, losses and inverter efficiency — with capacity factor, specific yield and value.",
    meta: "PVWatts Calculator — Solar Production Estimate (kWh)",
    inputs: [num("systemKw", "System Size (kW DC)", 8, 10000, 0.1), PSH(4.5), num("latitude", "Latitude (°)", 38, 70, 0.5), num("tilt", "Panel Tilt (°)", 25, 90, 1), ORIENT, pct("losses", "System Losses (PVWatts default 14%)", 14, 40, 0.5), pct("inverterEff", "Inverter Efficiency", 96, 100, 0.5), cur("pricePerKwh", "Electricity Value per kWh", 0.17, 1, 0.005)],
    results: [["annualKwh", "Annual Production (kWh)", "n"], ["monthlyAverageKwh", "Monthly Average (kWh)", "n"], ["dailyAverageKwh", "Daily Average (kWh)", "n"], ["capacityFactorPercent", "Capacity Factor", "p"], ["specificYield", "Specific Yield (kWh/kW)", "n"], ["annualValue", "Annual Value", "c"]],
    fn: E.pvwatts, ex: { systemKw: 8, sunHours: 4.5, latitude: 38, tilt: 25, orientation: 0, losses: 14, inverterEff: 96, pricePerKwh: 0.17 },
    exText: (o) => `Example: an 8 kW south-facing array at 25° tilt with 4.5 sun hours produces about ${fmt(o.annualKwh, 0)} kWh a year (${o.capacityFactorPercent}% capacity factor), worth ${usd(o.annualValue)}.`,
    how: "Enter the system size, your location's average peak sun hours (from NREL's maps or PVWatts), latitude, tilt and roof direction. Independent estimate using the same method as NREL's PVWatts.",
    assume: "Annual kWh = kW × sun hours × 365 × (1 − losses) × orientation × tilt adjustment (−0.4% per degree away from latitude). NREL's PVWatts uses hourly weather data and will be more precise.",
    faq: [["How accurate is PVWatts?", "Usually within ±10% annually for a typical year; any month can vary much more."]],
  }),
  mk({
    slug: "solar-panel-angle-calculator", title: "Solar Panel Angle Calculator",
    desc: "Find the best solar panel tilt angle for your latitude — fixed year-round, summer, winter and spring/fall — plus the ideal tilt and noon sun height on any date.",
    inputs: [num("latitude", "Latitude (° — negative for southern hemisphere)", 40, 70, 0.1, -70), dateField("date", "Date")],
    results: [["annualFixedTilt", "Best Fixed Tilt (year-round)", "n"], ["summerTilt", "Summer Tilt", "n"], ["winterTilt", "Winter Tilt", "n"], ["springFallTilt", "Spring / Fall Tilt", "n"], ["bestTiltOnDate", "Best Tilt on This Date", "n"], ["noonSunElevation", "Noon Sun Elevation (°)", "n"], ["declination", "Solar Declination (°)", "n"]],
    fn: E.panelAngle, ex: { latitude: 40, date: 20759 },
    exText: (o) => `Example: at 40° latitude the best year-round tilt is about ${o.annualFixedTilt}°; adjust to ${o.winterTilt}° in winter and ${o.summerTilt}° in summer.`,
    how: "Enter your latitude (e.g. 40 for Philadelphia, 34 for Los Angeles) and optionally a date. Angles are measured from horizontal; face panels true south in the northern hemisphere.",
    assume: "Seasonal rules from Landau's optimum-tilt study; date tilt = latitude − solar declination. Roof-mounted panels usually just follow roof pitch — the loss from a few degrees off is small.",
    faq: [["What is the best angle for solar panels?", "Roughly your latitude minus a few degrees for year-round output — about 33–34° at 40° latitude."]],
  }),
  mk({
    slug: "solar-battery-calculator", title: "Solar Battery & Home Backup Calculator",
    desc: "Size a solar battery bank or home backup battery — kWh needed for daily use or backup hours, amp-hours at your system voltage, Powerwall-size units and cost.",
    meta: "Solar Battery Bank Calculator — kWh, Ah & Powerwalls",
    inputs: [dropdown("mode", "Size For", opts(["Daily use × days of autonomy", "Backup hours at an average load"]), 1), num("dailyKwh", "Daily Energy Use (kWh)", 30, 10000, 0.5), num("daysAutonomy", "Days of Autonomy", 1, 10, 0.5), num("averageLoadKw", "Average Backup Load (kW)", 1.5, 1000, 0.1), num("backupHours", "Backup Hours", 12, 240, 1), dropdown("chemistry", "Battery Chemistry", opts(["Lithium iron phosphate (90% DoD)", "NMC lithium (80% DoD)", "Lead-acid (50% DoD)"]), 0), pct("inverterEff", "Inverter / Round-Trip Efficiency", 92, 100, 0.5), num("systemVoltage", "System Voltage (V)", 48, 1000, 1, 12), num("peakKw", "Peak Load (kW)", 7, 1000, 0.5), cur("costPerKwh", "Installed Cost per kWh of Battery", 1000, 5000, 10)],
    results: [["batteryCapacityKwh", "Battery Capacity Needed (kWh)", "n"], ["usableKwhNeeded", "Usable Energy Needed (kWh)", "n"], ["amphoursAtVoltage", "Amp-Hours at System Voltage", "n"], ["powerwallsNeeded", "13.5 kWh (Powerwall-size) Units", "n"], ["peakLoadOk", "Peak Load Covered by Those Units (1 = yes)", "n"], ["estimatedCost", "Estimated Installed Cost", "c"]],
    fn: E.solarBattery, ex: { mode: 1, dailyKwh: 30, daysAutonomy: 1, averageLoadKw: 1.5, backupHours: 12, chemistry: 0, inverterEff: 92, systemVoltage: 48, peakKw: 7, costPerKwh: 1000 },
    exText: (o) => `Example: backing up a 1.5 kW average load for 12 hours needs ${o.usableKwhNeeded} kWh usable — a ${o.batteryCapacityKwh} kWh LFP bank, or ${o.powerwallsNeeded} Powerwall-size units (about ${usd(o.estimatedCost)}).`,
    how: "Size for daily cycling (off-grid or time-of-use) or for outage backup of essential loads. Add up the loads you actually want to keep running.",
    assume: "Capacity = energy ÷ (depth of discharge × efficiency). A 13.5 kWh unit with ~11.5 kW continuous output is used as the Powerwall-size reference. 2026 installed costs run about $800–1,200 per kWh.",
    faq: [["How many batteries do I need for my house?", "For essential-load backup, one or two 13.5 kWh batteries; for whole-home overnight use, often two to three."]],
  }),
  mk({
    slug: "solar-charge-controller-calculator", title: "Solar Charge Controller Calculator (MPPT / PWM)",
    desc: "Size an MPPT or PWM solar charge controller — minimum amps, recommended standard size, cold-weather maximum PV voltage and voltage class (e.g. 100 V or 150 V).",
    meta: "Solar Charge Controller Calculator — MPPT Size (Victron-Style)",
    inputs: [dropdown("type", "Controller Type", opts(["MPPT", "PWM"]), 0), num("panelWatts", "Panel Wattage", 400, 1000, 5, 10), num("panels", "Number of Panels", 4, 200, 1, 1), num("seriesPanels", "Panels in Series per String", 2, 20, 1, 1), num("panelVoc", "Panel Voc (V)", 37, 100, 0.1), num("panelIsc", "Panel Isc (A)", 13.5, 30, 0.1), num("batteryVoltage", "Battery Voltage (V)", 24, 60, 12, 12), num("minTempC", "Coldest Temperature (°C)", -10, 30, 1, -40)],
    results: [["recommendedAmps", "Recommended Controller Size (A)", "n"], ["minControllerAmps", "Minimum Controller Amps", "n"], ["pvVoltageClass", "Max PV Voltage Rating Needed (V)", "n"], ["maxPvVoltageCold", "Array Voc at Coldest Temp (V)", "n"], ["arrayWatts", "Array Watts", "n"], ["parallelStrings", "Parallel Strings", "n"]],
    fn: E.chargeController, ex: { type: 0, panelWatts: 400, panels: 4, seriesPanels: 2, panelVoc: 37, panelIsc: 13.5, batteryVoltage: 24, minTempC: -10 },
    exText: (o) => `Example: four 400 W panels (2 in series, 2 strings) charging a 24 V bank need at least ${o.minControllerAmps} A MPPT — choose ${o.recommendedAmps} A — and a ${o.pvVoltageClass} V input rating (cold Voc ${o.maxPvVoltageCold} V), like a 150/100-class unit.`,
    how: "Enter your array and battery details from the panel datasheet. Choose a controller rated at or above both the current and voltage results.",
    assume: "MPPT amps = array W ÷ battery V × 1.25; PWM amps = Isc × strings × 1.25. Cold Voc uses a −0.3%/°C coefficient from 25 °C. Independent sizing aid — not affiliated with any brand.",
    faq: [["What size MPPT controller do I need?", "Divide array watts by battery voltage and add 25% — 1,600 W at 24 V needs about 85 A."]],
  }),
  mk({
    slug: "solar-lease-vs-buy-calculator", title: "Solar Lease vs Buy Calculator",
    desc: "Compare leasing and buying solar over 25 years — net savings, NPV and the better option — with lease escalators, utility rate increases, panel degradation and incentives.",
    inputs: [num("annualKwh", "Annual Solar Production (kWh)", 11000, 1000000, 10), cur("utilityRate", "Current Electricity Rate per kWh", 0.17, 1, 0.005), pct("rateEscalation", "Utility Rate Increase per Year", 3, 10, 0.1), pct("degradation", "Panel Degradation per Year", 0.5, 2, 0.05), cur("systemCost", "Purchase Price (cash)", 25000, 1000000, 100), pct("buyCredit", "Federal Credit for Purchase (0% after 2025)", 0, 30, 1), cur("otherIncentives", "Other Purchase Incentives", 0, 100000, 50), cur("maintenance", "Owner Maintenance per Year", 150, 5000, 5), cur("leasePayment", "Lease Payment per Month", 120, 2000, 1), pct("leaseEscalator", "Lease Escalator per Year", 2.9, 5, 0.1), num("leaseTerm", "Lease Term (years)", 25, 30, 1, 10), num("years", "Comparison Period (years)", 25, 30, 1, 5), pct("discountRate", "Discount Rate (for NPV)", 5, 15, 0.25)],
    results: [["betterOption", "Better Option (1 = buy, 2 = lease)", "n"], ["buyNetSavings", "Buy — Net Savings", "c"], ["leaseNetSavings", "Lease — Net Savings", "c"], ["difference", "Buy minus Lease", "c"], ["buyNpv", "Buy — NPV", "c"], ["leaseNpv", "Lease — NPV", "c"], ["buyNetCost", "Buy — Net Upfront Cost", "c"]],
    fn: E.leaseVsBuy, ex: { annualKwh: 11000, utilityRate: 0.17, rateEscalation: 3, degradation: 0.5, systemCost: 25000, buyCredit: 0, otherIncentives: 0, maintenance: 150, leasePayment: 120, leaseEscalator: 2.9, leaseTerm: 25, years: 25, discountRate: 5 },
    exText: (o) => `Example: buying a $25,000 system that makes 11,000 kWh saves about ${usd(o.buyNetSavings)} over 25 years versus ${usd(o.leaseNetSavings)} for a $120/month lease with a 2.9% escalator.`,
    how: "Enter the production estimate and both quotes. Leasing companies can still claim business tax credits in some cases and pass savings on through the payment.",
    assume: "Buying: upfront cost minus credits, then bill savings minus maintenance. Leasing: bill savings minus payments (lessor maintains). The homeowner §25D credit ended for systems placed in service after 2025.",
    faq: [["Is it better to lease or buy solar panels?", "Buying usually saves far more over 25 years if you can pay cash or finance cheaply; leasing suits those who want no upfront cost."]],
  }),
  mk({
    slug: "off-grid-solar-calculator", title: "Off-Grid & RV Solar Calculator",
    desc: "Size an off-grid, cabin or RV solar system — solar array watts and panels, battery amp-hours and kWh, charge controller and inverter — from daily watt-hours.",
    meta: "Off-Grid & RV Solar Calculator — How Much Solar Do I Need",
    inputs: [num("dailyWh", "Daily Energy Use (Wh)", 2500, 1000000, 10), PSH(4), num("daysAutonomy", "Days of Battery Autonomy", 2, 10, 0.5), dropdown("chemistry", "Battery", opts(["Lithium (LFP)", "Lead-acid / AGM"]), 0), num("systemVoltage", "System Voltage (V)", 12, 48, 12, 12), num("panelWatts", "Panel Wattage", 200, 700, 5, 50), pct("losses", "System Losses (wiring, charging, inverter)", 25, 50, 1), pct("winterMargin", "Winter / Cloudy Margin", 20, 200, 5), num("peakWatts", "Peak Simultaneous Load (W)", 1800, 50000, 10)],
    results: [["arrayWatts", "Solar Array (W)", "n"], ["panelsNeeded", "Panels", "n"], ["batteryAh", "Battery Bank (Ah)", "n"], ["batteryKwh", "Battery Bank (kWh)", "n"], ["controllerAmps", "Charge Controller (A)", "n"], ["inverterWatts", "Inverter Size (W)", "n"], ["dailyAh", "Daily Amp-Hours", "n"]],
    fn: E.offGrid, ex: { dailyWh: 2500, sunHours: 4, daysAutonomy: 2, chemistry: 0, systemVoltage: 12, panelWatts: 200, losses: 25, winterMargin: 20, peakWatts: 1800 },
    exText: (o) => `Example: an RV using 2,500 Wh a day needs about ${o.arrayWatts} W of solar (${o.panelsNeeded} × 200 W panels), a ${o.batteryAh} Ah 12 V lithium bank, a ${o.controllerAmps} A controller and a ${o.inverterWatts} W inverter.`,
    how: "List your devices' watts × hours per day to get daily Wh, then enter your sun hours (use winter values for year-round off-grid).",
    assume: "Array = daily Wh ÷ sun hours ÷ (1 − losses) × margin; battery = daily Wh × days ÷ depth of discharge (LFP 90%, lead-acid 50%); inverter = peak load × 1.25.",
    faq: [["How much solar do I need for my RV?", "Most RVers use 200–600 W of panels with 200–400 Ah of lithium at 12 V for typical boondocking."]],
  }),
  mk({
    slug: "commercial-solar-calculator", title: "Commercial Solar Panel Calculator",
    desc: "Evaluate a commercial solar project — installed cost, investment tax credit, bonus depreciation, net cost, annual production and savings, payback and 25-year return.",
    meta: "Commercial Solar Calculator — ITC, Depreciation & Payback",
    inputs: [num("systemKw", "System Size (kW DC)", 250, 100000, 1), cur("costPerWatt", "Installed Cost per Watt", 2.0, 10, 0.01), pct("itc", "Investment Tax Credit (§48E, if eligible)", 30, 50, 1), pct("bonusDepreciation", "Bonus Depreciation", 100, 100, 5), pct("taxRate", "Combined Tax Rate", 25, 50, 0.5), cur("otherIncentives", "Other Incentives / Grants", 0, 100000000, 100), PSH(4.5), cur("utilityRate", "Energy Rate per kWh", 0.13, 1, 0.005), pct("rateEscalation", "Rate Escalation per Year", 3, 10, 0.1), cur("demandSavings", "Annual Demand Charge Savings", 4000, 10000000, 100), cur("omPerKw", "O&M per kW per Year", 18, 200, 0.5)],
    results: [["netCostAfterIncentives", "Net Cost After Incentives", "c"], ["grossCost", "Gross Installed Cost", "c"], ["investmentTaxCredit", "Investment Tax Credit", "c"], ["depreciationTaxSavings", "Depreciation Tax Savings", "c"], ["annualProductionKwh", "Annual Production (kWh)", "n"], ["firstYearSavings", "First-Year Savings", "c"], ["paybackYears", "Payback (years)", "n"], ["twentyFiveYearNet", "25-Year Net Return", "c"]],
    fn: E.commercialSolar, ex: { systemKw: 250, costPerWatt: 2, itc: 30, bonusDepreciation: 100, taxRate: 25, otherIncentives: 0, sunHours: 4.5, utilityRate: 0.13, rateEscalation: 3, demandSavings: 4000, omPerKw: 18 },
    exText: (o) => `Example: a 250 kW system at $2.00/W costs ${usd(o.grossCost)}; with a 30% ITC and 100% bonus depreciation the net cost is ${usd(o.netCostAfterIncentives)}, paying back in about ${o.paybackYears} years.`,
    how: "Enter system size and quote, tax assumptions and your tariff. Confirm ITC eligibility with your tax advisor — §48E deadlines depend on when construction began and the placed-in-service date.",
    assume: "Depreciable basis = cost − ½ ITC; 2025 law restored 100% bonus depreciation for qualifying property. Production uses 14% losses and 0.5%/yr degradation.",
    faq: [["How long is the payback on commercial solar?", "Often 4–7 years with tax credits and depreciation, longer without them."]],
  }),
  mk({
    slug: "texas-solar-panel-cost-calculator", title: "Texas Solar Panel Cost Calculator",
    desc: "Estimate solar panel cost and savings in Texas — system size from your usage, installed price, buyback-plan export credits, local rebates, payback and 25-year savings.",
    meta: "Solar Calculator Texas — Cost, Savings & Payback",
    inputs: STATE_INPUTS(2.6, 0.15, 60),
    results: STATE_RESULTS,
    fn: E.stateSolar("TX"), ex: { ...stateEx, selfConsumption: 60 },
    exText: (o) => `Example: a Texas home using 1,000 kWh a month needs about ${o.systemSizeKw} kW; at ~$2.60/W it costs ${usd(o.grossCost)} and saves about ${usd(o.firstYearSavings)} in year one — a ${o.paybackYears}-year payback.`,
    how: "Enter your monthly use. Texas has no statewide net metering — exports are credited by your retail plan's buyback rate, so self-consumption matters.",
    assume: "Texas averages: ~5.0 peak sun hours, ~$2.60/W installed, ~15¢/kWh retail. Default export credit ≈ 35% of retail (typical buyback plans). Austin Energy, CPS Energy and some co-ops offer rebates — enter them. Solar adds no property tax in Texas.",
    faq: [["Is solar worth it in Texas?", "Often yes thanks to strong sun, but savings depend on a good buyback plan since there's no statewide net metering."]],
  }),
  mk({
    slug: "california-solar-panel-cost-calculator", title: "California Solar Panel Cost Calculator",
    desc: "Estimate solar cost and savings in California under NEM 3.0 — system size, installed price, low export credits, self-consumption, payback and 25-year savings.",
    meta: "Solar Cost Calculator California — NEM 3.0 Savings",
    inputs: STATE_INPUTS(3.1, 0.32, 40),
    results: STATE_RESULTS,
    fn: E.stateSolar("CA"), ex: { ...stateEx, selfConsumption: 40 },
    exText: (o) => `Example: a California home using 1,000 kWh a month needs about ${o.systemSizeKw} kW (${usd(o.grossCost)}); under NEM 3.0 with 40% self-consumption it saves about ${usd(o.firstYearSavings)} a year — payback ${o.paybackYears} years.`,
    how: "Enter your usage. Under NEM 3.0 (Net Billing Tariff), exported power earns far less than retail, so adding a battery to raise self-consumption often improves savings.",
    assume: "California averages: ~5.4 peak sun hours, ~$3.10/W, ~32¢/kWh. Exports valued at ~25% of retail on average under the Net Billing Tariff (varies by hour). Solar is excluded from property tax reassessment.",
    faq: [["Is solar still worth it in California after NEM 3.0?", "Usually yes with high electricity rates, especially when paired with a battery; paybacks are longer than under NEM 2.0."]],
  }),
  mk({
    slug: "florida-solar-panel-cost-calculator", title: "Florida Solar Panel Cost Calculator",
    desc: "Estimate solar panel cost and savings in Florida with full retail net metering — system size, installed price, sales and property tax exemptions, payback and 25-year savings.",
    meta: "Solar Panel Cost Calculator Florida — Savings & Payback",
    inputs: STATE_INPUTS(2.6, 0.15, 50),
    results: STATE_RESULTS,
    fn: E.stateSolar("FL"), ex: stateEx,
    exText: (o) => `Example: a Florida home using 1,000 kWh a month needs about ${o.systemSizeKw} kW for ${usd(o.grossCost)}; with retail net metering it saves about ${usd(o.firstYearSavings)} in year one — payback ${o.paybackYears} years.`,
    how: "Enter your monthly use. Florida investor-owned utilities credit exports at the retail rate monthly (excess annually at avoided cost).",
    assume: "Florida averages: ~4.9 peak sun hours, ~$2.60/W, ~15¢/kWh. Solar equipment is exempt from Florida sales tax and the added value from property tax.",
    faq: [["Does Florida have net metering?", "Yes — FPL, Duke and TECO customers get retail-rate credits for exported solar under the state's net metering rule."]],
  }),
  mk({
    slug: "new-york-solar-panel-cost-calculator", title: "New York Solar Panel Cost Calculator",
    desc: "Estimate solar cost and savings in New York — NY-Sun incentive, 25% state tax credit (up to $5,000), net metering, payback and 25-year savings.",
    meta: "Solar Panel Cost Calculator New York — NY-Sun & State Credit",
    inputs: STATE_INPUTS(3.2, 0.25, 50),
    results: STATE_RESULTS,
    fn: E.stateSolar("NY"), ex: stateEx,
    exText: (o) => `Example: a New York home using 1,000 kWh a month needs about ${o.systemSizeKw} kW (${usd(o.grossCost)}); the NY-Sun incentive and state credit cut that by ${usd(o.stateIncentives)}, for a ${o.paybackYears}-year payback.`,
    how: "Enter your monthly use. The state income tax credit is 25% of cost up to $5,000; NY-Sun per-watt incentives vary by utility and block.",
    assume: "New York averages: ~3.9 peak sun hours, ~$3.20/W, ~25¢/kWh; NY-Sun incentive ~$0.20/W (check the current block); retail net metering for residential systems.",
    faq: [["What solar incentives does New York offer?", "A 25% state tax credit up to $5,000, NY-Sun rebates, a sales tax exemption and a 15-year property tax exemption in most areas."]],
  }),
  mk({
    slug: "vder-calculator", title: "VDER (NY Value Stack) Calculator",
    desc: "Estimate New York Value of Distributed Energy Resources (Value Stack) credits — energy (LBMP), capacity (ICAP), environmental, DRV, LSRV and community credit — for a solar project.",
    meta: "VDER Calculator — New York Value Stack Credits",
    inputs: [num("annualKwh", "Annual Production (kWh)", 1500000, 1000000000, 100), cur("lbmp", "Energy (LBMP) $/kWh", 0.045, 1, 0.001), cur("icap", "Capacity (ICAP) $/kWh", 0.012, 1, 0.001), cur("environmental", "Environmental Value $/kWh", 0.031, 1, 0.001), cur("drv", "Demand Reduction Value $/kWh", 0.01, 1, 0.001), cur("lsrv", "Locational System Relief Value $/kWh", 0, 1, 0.001), cur("communityCredit", "Community Credit / MTC $/kWh", 0, 1, 0.001), pct("subscriberDiscount", "Community Solar Subscriber Discount", 10, 50, 0.5)],
    results: [["annualCredit", "Annual Value Stack Credit", "c"], ["valuePerKwh", "Total Value per kWh", "c"], ["energyValue", "Energy (LBMP)", "c"], ["capacityValue", "Capacity (ICAP)", "c"], ["environmentalValue", "Environmental", "c"], ["drvAndLsrv", "DRV + LSRV", "c"], ["subscriberSavings", "Subscriber Savings (community solar)", "c"]],
    fn: E.vder, ex: { annualKwh: 1500000, lbmp: 0.045, icap: 0.012, environmental: 0.031, drv: 0.01, lsrv: 0, communityCredit: 0, subscriberDiscount: 10 },
    exText: (o) => `Example: a 1 MW community solar farm producing 1.5 million kWh earns about ${usd(o.annualCredit)} a year at ${o.valuePerKwh} $/kWh across the Value Stack components.`,
    how: "Enter annual production and each component's average value for your utility zone and tranche (from the NYSERDA Value Stack calculator or your utility's tariff).",
    assume: "Values are illustrative averages; LBMP and ICAP vary hourly and by zone, DRV depends on output during the utility's top hours, and E is set by the Clean Energy Standard REC price.",
    faq: [["What is VDER?", "New York's Value of Distributed Energy Resources tariff, which credits exported energy at a 'Value Stack' instead of the retail rate."]],
  }),
  mk({
    slug: "hydro-power-calculator", title: "Hydro Power Calculator",
    desc: "Calculate hydroelectric power from flow and head — kW and horsepower, annual kWh at your capacity factor, and annual value — for micro-hydro or small hydro sites.",
    inputs: [dropdown("flowUnit", "Flow Unit", opts(["Cubic feet per second (cfs)", "Gallons per minute (gpm)", "Cubic meters per second"]), 1), num("flow", "Flow", 300, 1000000, 1), dropdown("headUnit", "Head Unit", opts(["Feet", "Meters"]), 0), num("head", "Gross Head", 100, 5000, 1), pct("headLoss", "Penstock Head Loss", 10, 50, 1), pct("efficiency", "Turbine + Generator Efficiency", 70, 95, 1), pct("capacityFactor", "Capacity Factor", 60, 100, 1), cur("pricePerKwh", "Value per kWh", 0.15, 1, 0.005)],
    results: [["powerKw", "Power Output (kW)", "n"], ["powerHp", "Power (hp)", "n"], ["annualKwh", "Annual Energy (kWh)", "n"], ["annualValue", "Annual Value", "c"], ["netHeadFt", "Net Head (ft)", "n"], ["flowCfs", "Flow (cfs)", "n"]],
    fn: E.hydroPower, ex: { flowUnit: 1, flow: 300, headUnit: 0, head: 100, headLoss: 10, efficiency: 70, capacityFactor: 60, pricePerKwh: 0.15 },
    exText: (o) => `Example: 300 gpm falling 100 ft (90 ft net) at 70% efficiency makes about ${o.powerKw} kW — ${fmt(o.annualKwh, 0)} kWh a year, worth ${usd(o.annualValue)}.`,
    how: "Measure the flow you can divert (low season) and the vertical drop from intake to turbine.",
    assume: "P (kW) = Q (cfs) × net head (ft) × efficiency ÷ 11.8 (equivalent to ρ·g·Q·H). Micro-hydro systems run 50–80% wire-to-water efficiency.",
    faq: [["How much power can a stream produce?", "Roughly flow (cfs) × head (ft) ÷ 15 kW at typical efficiency — 1 cfs falling 100 ft makes about 6 kW."]],
  }),
  mk({
    slug: "kw-calculator", title: "kW & Watt Calculator",
    desc: "Convert between volts, amps, watts, kW, kVA, horsepower and BTU/h for DC, single-phase and three-phase circuits — plus energy use and cost over time.",
    meta: "kW Calculator — Watts, Amps, Volts, kVA & HP",
    inputs: [dropdown("mode", "Calculate From", opts(["Volts and amps", "Known kW"]), 0), dropdown("phase", "Circuit", opts(["DC", "Single-phase AC", "Three-phase AC"]), 1), num("volts", "Voltage (V)", 240, 100000, 1), num("amps", "Current (A)", 30, 100000, 0.1), num("kw", "Power (kW)", 7.2, 100000, 0.01), num("powerFactor", "Power Factor (AC)", 1, 1, 0.01, 0.01), num("hours", "Hours of Use", 10, 100000, 0.5), cur("pricePerKwh", "Electricity Price per kWh", 0.17, 1, 0.005)],
    results: [["kilowatts", "Kilowatts (kW)", "n"], ["watts", "Watts", "n"], ["kva", "kVA", "n"], ["amps", "Amps", "n"], ["horsepower", "Horsepower", "n"], ["btuPerHour", "BTU per Hour", "n"], ["kwhOverPeriod", "Energy over Period (kWh)", "n"], ["costOverPeriod", "Cost over Period", "c"]],
    fn: E.kwWatt, ex: { mode: 0, phase: 1, volts: 240, amps: 30, kw: 7.2, powerFactor: 1, hours: 10, pricePerKwh: 0.17 },
    exText: (o) => `Example: 240 V × 30 A single-phase at unity power factor is ${o.watts} W = ${o.kilowatts} kW (${o.horsepower} hp); running 10 hours uses ${o.kwhOverPeriod} kWh, costing ${usd(o.costOverPeriod)}.`,
    how: "Enter volts and amps (or a known kW) and the circuit type. Motors and inductive loads have a power factor below 1.",
    assume: "W = V × A × PF (single-phase) or √3 × V × A × PF (three-phase); 1 hp = 745.7 W; 1 W = 3.412 BTU/h.",
    faq: [["How do I convert amps to kW?", "kW = volts × amps × power factor ÷ 1,000 (× 1.732 for three-phase)."]],
  }),
  mk({
    slug: "electrical-load-calculator", title: "Electrical Load Calculator (Service Size)",
    desc: "Calculate a home's electrical load with the NEC 220.82 optional method — general lighting, small-appliance and laundry circuits, appliances and HVAC — and the service size you need.",
    meta: "Electrical Load Calculator — NEC Service Size (100/200/400 A)",
    inputs: [num("sqFt", "Living Area (sq ft)", 2400, 50000, 10), num("smallApplianceCircuits", "Small-Appliance Circuits (min 2)", 2, 10, 1, 2), yn("laundry", "Laundry Circuit?", 1), num("range", "Range / Cooktop (VA)", 12000, 30000, 100), num("dryer", "Electric Dryer (VA)", 5000, 10000, 100), num("waterHeater", "Water Heater (VA)", 4500, 20000, 100), num("dishwasher", "Dishwasher (VA)", 1200, 3000, 50), num("disposal", "Disposal (VA)", 800, 2000, 50), num("evCharger", "EV Charger (VA)", 9600, 20000, 100), num("otherVa", "Other Fixed Appliances (VA)", 1500, 100000, 100), num("coolingVa", "Air Conditioning / Heat Pump (VA)", 6000, 50000, 100), num("heatingVa", "Electric Heat (VA)", 0, 100000, 100), num("voltage", "Service Voltage", 240, 480, 1, 120)],
    results: [["recommendedService", "Recommended Service (A)", "n"], ["serviceAmps", "Calculated Load (A)", "n"], ["calculatedLoadVa", "Calculated Load (VA)", "n"], ["generalLoadVa", "General Lighting & Receptacles (VA)", "n"], ["applianceLoadVa", "Appliances (VA)", "n"], ["demandAfterFactorsVa", "After Demand Factors (VA)", "n"], ["hvacVa", "HVAC at 100% (VA)", "n"], ["spareCapacityPercent", "Spare Capacity", "p"]],
    fn: E.dwellingLoad, ex: { sqFt: 2400, smallApplianceCircuits: 2, laundry: 1, range: 12000, dryer: 5000, waterHeater: 4500, dishwasher: 1200, disposal: 800, evCharger: 9600, otherVa: 1500, coolingVa: 6000, heatingVa: 0, voltage: 240 },
    exText: (o) => `Example: a 2,400 sq ft all-electric-kitchen home with an EV charger calculates to ${fmt(o.calculatedLoadVa, 0)} VA — ${o.serviceAmps} A at 240 V, so a ${o.recommendedService} A service.`,
    how: "Enter the living area and the nameplate VA of fixed appliances. Use the larger of heating or cooling — the method only counts one.",
    assume: "NEC 220.82: 3 VA per sq ft + 1,500 VA per small-appliance and laundry circuit + appliances; first 10 kVA at 100% and the rest at 40%; plus 100% of the larger HVAC load. Load calcs for permits must be done to your adopted code edition.",
    faq: [["Do I need a 200 amp service?", "Most modern homes with central AC, an electric range or an EV charger calculate between 100 and 200 A; 200 A is the common choice."]],
  }),
  mk({
    slug: "three-phase-power-calculator", title: "Three-Phase Power Calculator (kW, kVA, MVA)",
    desc: "Calculate three-phase power — kW, kVA, MVA, kVAR, amps and motor horsepower — from voltage, current and power factor, or solve for amps from kW or kVA.",
    meta: "Three Phase Power Calculator — kW, kVA, MVA & Amps",
    inputs: [dropdown("mode", "Known Value", opts(["Amps", "kW", "kVA"]), 0), num("voltage", "Line-to-Line Voltage (V)", 480, 1000000, 1), num("amps", "Line Current (A)", 100, 1000000, 0.1), num("kw", "Real Power (kW)", 70, 10000000, 0.1), num("kva", "Apparent Power (kVA)", 83, 10000000, 0.1), num("powerFactor", "Power Factor", 0.85, 1, 0.01, 0.01), pct("efficiency", "Motor Efficiency (for hp)", 92, 100, 0.5)],
    results: [["kilowatts", "Real Power (kW)", "n"], ["kva", "Apparent Power (kVA)", "n"], ["mva", "MVA", "n"], ["amps", "Line Current (A)", "n"], ["kvar", "Reactive Power (kVAR)", "n"], ["horsepower", "Motor Output (hp)", "n"]],
    fn: E.threePhase, ex: { mode: 0, voltage: 480, amps: 100, kw: 70, kva: 83, powerFactor: 0.85, efficiency: 92 },
    exText: (o) => `Example: 100 A at 480 V three-phase is ${o.kva} kVA; at 0.85 power factor that's ${o.kilowatts} kW real power and ${o.kvar} kVAR reactive.`,
    how: "Choose what you know, enter the line-to-line voltage and power factor.",
    assume: "kVA = √3 × V × I ÷ 1,000; kW = kVA × PF; kVAR = √(kVA² − kW²); 1 MVA = 1,000 kVA.",
    faq: [["How do you calculate three-phase power?", "kW = 1.732 × volts × amps × power factor ÷ 1,000."]],
  }),
  mk({
    slug: "transformer-size-calculator", title: "Transformer Size Calculator",
    desc: "Size a single- or three-phase transformer — required kVA with growth margin, the next standard kVA rating, primary and secondary full-load amps and loading.",
    inputs: [dropdown("phase", "Phase", opts(["Single-phase", "Three-phase"]), 1), dropdown("mode", "Load Entered As", opts(["kW + power factor", "Secondary amps"]), 0), num("loadKw", "Load (kW)", 100, 100000, 0.1), num("powerFactor", "Power Factor", 0.9, 1, 0.01, 0.1), num("loadAmps", "Load Current (A)", 150, 100000, 0.1), num("primaryVoltage", "Primary Voltage (V)", 480, 1000000, 1), num("secondaryVoltage", "Secondary Voltage (V)", 208, 100000, 1), pct("growth", "Growth / Safety Margin", 20, 100, 1)],
    results: [["recommendedKva", "Recommended Transformer (kVA)", "n"], ["requiredKva", "Required kVA (with margin)", "n"], ["loadKva", "Load kVA", "n"], ["primaryFullLoadAmps", "Primary Full-Load Amps", "n"], ["secondaryFullLoadAmps", "Secondary Full-Load Amps", "n"], ["loadingPercent", "Loading at Present Load", "p"]],
    fn: E.transformer, ex: { phase: 1, mode: 0, loadKw: 100, powerFactor: 0.9, loadAmps: 150, primaryVoltage: 480, secondaryVoltage: 208, growth: 20 },
    exText: (o) => `Example: a 100 kW load at 0.9 PF is ${o.loadKva} kVA; with 20% margin choose a ${o.recommendedKva} kVA 480–208Y/120 transformer (${o.secondaryFullLoadAmps} A secondary).`,
    how: "Enter the connected or demand load and voltages. Size for future growth and check harmonic (K-rated) needs for IT and LED loads.",
    assume: "kVA = kW ÷ PF; FLA = kVA × 1,000 ÷ (√3 × V) for three-phase. Standard ratings per ANSI/IEEE C57.",
    faq: [["How do I size a transformer?", "Add up the load in kVA, add 20–25% for growth, and pick the next standard size."]],
  }),
  mk({
    slug: "electrical-bid-calculator", title: "Electrical Bid Calculator",
    desc: "Build an electrical contractor bid from labor units — receptacles, switches, fixtures, panels, circuits, conduit and wire — plus materials, overhead and profit, with crew days.",
    inputs: [num("receptacles", "Receptacles", 60, 100000), num("switches", "Switches", 30, 100000), num("fixtures", "Light Fixtures", 40, 100000), num("panels", "Panels / Subpanels", 2, 1000), num("circuits", "Home-Run Circuits", 35, 10000), num("conduitFeet", "Conduit (ft)", 800, 1000000), num("wireFeet", "Wire Pulled (ft)", 6000, 10000000), num("hookups", "Equipment / Appliance Hookups", 6, 10000), pct("difficulty", "Difficulty Adjustment", 10, 100, 1), cur("laborRate", "Labor Rate per Hour (burdened)", 85, 500, 0.5), cur("materials", "Materials", 9500, 100000000, 10), cur("permits", "Permits & Inspections", 450, 1000000, 10), cur("equipment", "Equipment / Lift Rental", 600, 1000000, 10), pct("overhead", "Overhead", 15, 100, 0.5), pct("profit", "Profit", 10, 100, 0.5), num("crewSize", "Crew Size", 2, 50, 1, 1)],
    results: [["bidPrice", "Bid Price", "c"], ["laborHours", "Labor Hours", "n"], ["laborCost", "Labor", "c"], ["materials", "Materials", "c"], ["overheadAmount", "Overhead", "c"], ["profitAmount", "Profit", "c"], ["crewDays", "Crew Days", "n"]],
    fn: E.electricalBid, ex: { receptacles: 60, switches: 30, fixtures: 40, panels: 2, circuits: 35, conduitFeet: 800, wireFeet: 6000, hookups: 6, difficulty: 10, laborRate: 85, materials: 9500, permits: 450, equipment: 600, overhead: 15, profit: 10, crewSize: 2 },
    exText: (o) => `Example: a small commercial fit-out with 60 receptacles, 40 fixtures and 2 panels takes about ${o.laborHours} labor hours; with materials, 15% overhead and 10% profit the bid is ${usd(o.bidPrice)} (${o.crewDays} crew days for 2).`,
    how: "Count devices and footage from the plans, then enter your burdened labor rate, material takeoff and markups.",
    assume: "Labor units (hours each): receptacle/switch 0.35, fixture 0.9, panel 8, home run 1.25, conduit 0.06/ft, wire 0.008/ft, hookup 3 — typical NECA-style averages; adjust for your crews.",
    faq: [["How do electricians bid jobs?", "By labor units per device and foot of conduit or wire, times a burdened rate, plus materials, overhead and profit."]],
  }),
  mk({
    slug: "electrical-installation-cost-calculator", title: "Electrical Installation Cost Calculator",
    desc: "Estimate electrical installation cost for residential or commercial wiring, rewires, tenant improvements, panel and service upgrades, EV chargers and generator hookups.",
    inputs: [dropdown("job", "Job", opts(E.ELECTRICAL_JOBS.map(([n, s, f]) => (s ? `${n} (~$${s}/sq ft)` : `${n} (~$${f.toLocaleString("en-US")})`))), 0), num("sqFt", "Area (sq ft, per-sq-ft jobs)", 2500, 10000000, 10), region, cur("permits", "Permits", 350, 100000, 10), yn("utilityWork", "Utility Service Work Needed?"), cur("utilityCost", "Utility / Meter Work Cost", 1500, 100000, 50)],
    results: [["totalCost", "Estimated Total Cost", "c"], ["installCost", "Installation", "c"], ["costPerSqFt", "Cost per Sq Ft", "c"], ["lowEstimate", "Low Estimate", "c"], ["highEstimate", "High Estimate", "c"]],
    fn: E.electricalInstall, ex: { job: 0, sqFt: 2500, regionAdjust: 0, permits: 350, utilityWork: 0, utilityCost: 1500 },
    exText: (o) => `Example: wiring a new 2,500 sq ft home costs about ${usd(o.totalCost)} (${usd(o.lowEstimate)}–${usd(o.highEstimate)}).`,
    how: "Choose the job type and enter the area for per-square-foot work. Flat-price jobs ignore area.",
    assume: "2026 US mid-range installed prices: new residential $4–8/sq ft, rewire $6–12, commercial new $10–25, TI $8–16; panel upgrade ~$2,000–4,000; Level 2 EV charger ~$1,000–2,500.",
    faq: [["How much does it cost to wire a house?", "About $4–8 per sq ft for new construction and $6–12 to rewire an existing home."]],
  }),
  mk({
    slug: "wire-size-calculator", title: "Wire Size Calculator (Voltage Drop & Ampacity)",
    desc: "Find the right wire gauge for any circuit — copper or aluminum, DC, single- or three-phase, including low-voltage and solar — by ampacity and voltage drop, with volts at the load.",
    meta: "Wire Size Calculator — Gauge by Amps, Distance & Voltage Drop",
    inputs: [num("amps", "Load Current (A)", 40, 1000, 0.5), yn("continuous", "Continuous Load (×125%)?", 1), num("voltage", "Voltage (V)", 240, 1000, 1, 6), dropdown("phase", "Circuit", opts(["DC (solar, 12/24/48 V)", "Single-phase AC", "Three-phase AC"]), 1), num("distance", "One-Way Distance (ft)", 100, 5000, 1), dropdown("conductor", "Conductor", opts(["Copper", "Aluminum"]), 0), pct("maxDropPercent", "Max Voltage Drop", 3, 10, 0.5)],
    results: [["wireSizeCode", `Recommended Size (AWG; 0 = 1/0, −1 = 2/0, −2 = 3/0, −3 = 4/0, 250+ = kcmil; 999 = none fits)`, "n"], ["voltageDropPercent", "Voltage Drop", "p"], ["voltageDropVolts", "Voltage Drop (V)", "n"], ["voltsAtLoad", "Volts at Load", "n"], ["ampacity", "Wire Ampacity at 75 °C (A)", "n"], ["designAmps", "Design Current (A)", "n"]],
    fn: E.wireSize, ex: { amps: 40, continuous: 1, voltage: 240, phase: 1, distance: 100, conductor: 0, maxDropPercent: 3 },
    exText: (o) => `Example: a 40 A continuous load at 240 V, 100 ft away, needs ${o.wireSizeCode} AWG copper (${o.ampacity} A) with a ${o.voltageDropPercent}% voltage drop.`,
    how: "Enter the load current, voltage, one-way distance and conductor. For solar PV and 12/24 V systems choose DC; keep drop under 2–3%.",
    assume: `NEC Table 310.16 75 °C ampacities with small-conductor limits (14 AWG 15 A, 12 AWG 20 A, 10 AWG 30 A copper); resistance from NEC Chapter 9 Table 8 (aluminum ≈ 1.64× copper). Sizes listed: ${WIRE_LABELS.join(", ")}. Derate for conduit fill and ambient temperature where required.`,
    faq: [["What size wire for 50 amps?", "6 AWG copper at 75 °C for a short run; upsize for long runs to limit voltage drop."], ["What voltage drop is acceptable?", "The NEC recommends no more than 3% on a branch circuit and 5% total."]],
  }),
  mk({
    slug: "boiler-efficiency-calculator", title: "Boiler Efficiency Calculator",
    desc: "Calculate steam boiler efficiency by the direct (input–output) method — steam output, fuel input, boiler horsepower, losses and fuel cost per 1,000 lb of steam.",
    inputs: [num("steamLbPerHour", "Steam Output (lb/h)", 10000, 10000000, 10), dropdown("pressure", "Steam Pressure (saturated)", opts(E.STEAM_H.map(([n, h]) => `${n} (${h} BTU/lb)`)), 4), num("feedwaterTemp", "Feedwater Temperature (°F)", 220, 400, 1, 32), dropdown("fuel", "Fuel", opts(["Natural gas (cu ft/h)", "No. 2 oil (gal/h)", "Propane (gal/h)"]), 0), num("fuelPerHour", "Fuel Use per Hour", 12500, 100000000, 1), cur("fuelPrice", "Fuel Price per Unit (per cu ft / gal)", 0.008, 10, 0.0005)],
    results: [["efficiencyPercent", "Boiler Efficiency", "p"], ["outputMmbtuPerHour", "Output (MMBtu/h)", "n"], ["inputMmbtuPerHour", "Input (MMBtu/h)", "n"], ["boilerHorsepower", "Boiler Horsepower", "n"], ["lossesPercent", "Losses", "p"], ["fuelCostPerHour", "Fuel Cost per Hour", "c"], ["costPer1000LbSteam", "Cost per 1,000 lb Steam", "c"]],
    fn: E.boilerEfficiency, ex: { steamLbPerHour: 10000, pressure: 4, feedwaterTemp: 220, fuel: 0, fuelPerHour: 12500, fuelPrice: 0.008 },
    exText: (o) => `Example: 10,000 lb/h of 150 psig steam from 220 °F feedwater burning 12,500 cu ft/h of gas is ${o.efficiencyPercent}% efficient — about ${usd(o.costPer1000LbSteam)} per 1,000 lb of steam.`,
    how: "Measure steam output, feedwater temperature and fuel flow over the same period at steady load.",
    assume: "Efficiency = steam × (h_steam − h_feedwater) ÷ (fuel × HHV); HHV: natural gas 1,038 BTU/cu ft, No. 2 oil 138,500 BTU/gal, propane 91,500 BTU/gal. 1 boiler hp = 33,475 BTU/h.",
    faq: [["What is a good boiler efficiency?", "Modern firetube steam boilers run about 80–85% (HHV); condensing hot-water boilers can exceed 90%."]],
  }),
  mk({
    slug: "sub-meter-calculator", title: "Sub Meter Billing Calculator",
    desc: "Bill a tenant from a sub meter reading — kWh used with CT multiplier, rate from the master bill or a fixed rate, admin fee and share of the building's usage.",
    meta: "Sub Meter Calculator — Tenant Electric Bill from Readings",
    inputs: [num("previousReading", "Previous Reading", 41250, 100000000, 1), num("currentReading", "Current Reading", 42080, 100000000, 1), num("multiplier", "Meter Multiplier (CT ratio)", 1, 1000, 1, 1), dropdown("rateSource", "Rate", opts(["Average rate from master bill", "Fixed rate"]), 0), cur("masterBill", "Master Bill Total", 2850, 10000000, 0.01), num("masterKwh", "Master Meter kWh", 16500, 100000000, 1), cur("fixedRate", "Fixed Rate per kWh", 0.17, 1, 0.001), cur("fixedShare", "Share of Fixed Charges", 0, 10000, 0.5), cur("adminFee", "Admin / Billing Fee", 3.5, 500, 0.25)],
    results: [["tenantCharge", "Tenant Charge", "c"], ["kwhUsed", "kWh Used", "n"], ["ratePerKwh", "Rate per kWh", "c"], ["energyCharge", "Energy Charge", "c"], ["shareOfBuildingPercent", "Share of Building Use", "p"]],
    fn: E.subMeter, ex: { previousReading: 41250, currentReading: 42080, multiplier: 1, rateSource: 0, masterBill: 2850, masterKwh: 16500, fixedRate: 0.17, fixedShare: 0, adminFee: 3.5 },
    exText: (o) => `Example: a tenant who used ${o.kwhUsed} kWh at the building's average ${o.ratePerKwh} $/kWh owes ${usd(o.tenantCharge)} including the admin fee.`,
    how: "Enter last and this period's readings (and the CT multiplier printed on the meter), then the master bill or a fixed rate.",
    assume: "Many states limit what landlords can charge for sub-metered electricity (often no more than the utility's rate) — check your state utility commission rules.",
    faq: [["How do I read a sub meter?", "Subtract the previous reading from the current one and multiply by the meter's multiplier."]],
  }),
  mk({
    slug: "lcoe-calculator", title: "LCOE Calculator (Levelized Cost of Energy)",
    desc: "Calculate the levelized cost of energy for solar, wind, batteries or generators — discounted lifetime costs ÷ discounted energy — in $/kWh and $/MWh, versus the grid price.",
    meta: "LCOE Calculator — Levelized Cost of Electricity",
    inputs: [cur("capex", "Upfront Capital Cost", 2000000, 10000000000, 1000), cur("annualOm", "Annual O&M", 25000, 100000000, 100), pct("costEscalation", "O&M Escalation per Year", 2.5, 10, 0.1), cur("annualFuel", "Annual Fuel Cost", 0, 100000000, 100), num("annualKwh", "Year-1 Energy Output (kWh)", 1500000, 100000000000, 1000), pct("degradation", "Output Degradation per Year", 0.5, 5, 0.05), num("lifeYears", "Project Life (years)", 25, 50, 1, 1), pct("discountRate", "Discount Rate", 7, 20, 0.25), cur("gridPrice", "Grid / Alternative Price per kWh", 0.12, 1, 0.005)],
    results: [["lcoePerKwh", "LCOE ($/kWh)", "c"], ["lcoePerMwh", "LCOE ($/MWh)", "c"], ["discountedCosts", "Discounted Lifetime Costs", "c"], ["discountedEnergyKwh", "Discounted Lifetime Energy (kWh)", "n"], ["vsGridPricePercent", "LCOE as % of Grid Price", "p"]],
    fn: E.lcoe, ex: { capex: 2000000, annualOm: 25000, costEscalation: 2.5, annualFuel: 0, annualKwh: 1500000, degradation: 0.5, lifeYears: 25, discountRate: 7, gridPrice: 0.12 },
    exText: (o) => `Example: a $2M, 1 MW solar plant producing 1.5 GWh a year at a 7% discount rate has an LCOE of ${o.lcoePerKwh} $/kWh (${usd(o.lcoePerMwh)}/MWh).`,
    how: "Enter capital cost, yearly costs and output, project life and your discount rate (WACC). Include tax credits by reducing capex.",
    assume: "LCOE = Σ discounted costs ÷ Σ discounted energy, with capex at year 0 and costs and output from year 1.",
    faq: [["What is LCOE?", "The average lifetime cost per unit of electricity, used to compare generation options."]],
  }),
  mk({
    slug: "load-bank-calculator", title: "Load Bank Test Calculator",
    desc: "Plan a generator load bank test — recommended load bank size, kW and kVA at 25/50/75/100% steps, current at your voltage, NFPA 110 minimum and diesel used.",
    inputs: [num("generatorKw", "Generator Rating (kW)", 500, 10000, 5), dropdown("loadType", "Load Bank Type", opts(["Resistive (1.0 PF)", "Resistive-reactive (0.8 PF)"]), 0), num("voltage", "Voltage (V)", 480, 15000, 1, 120), dropdown("phase", "Phase", opts(["Single-phase", "Three-phase"]), 1), num("testHours", "Test Duration (hours, all steps)", 4, 24, 0.5)],
    results: [["recommendedLoadBankKw", "Recommended Load Bank (kW)", "n"], ["kwAt25", "Step 1: 25% (kW)", "n"], ["kwAt50", "Step 2: 50% (kW)", "n"], ["kwAt75", "Step 3: 75% (kW)", "n"], ["kwAt100", "Step 4: 100% (kW)", "n"], ["kvaAt100", "kVA at 100%", "n"], ["ampsAt100", "Amps at 100%", "n"], ["nfpa110MinimumKw", "NFPA 110 Minimum Monthly Load (30%)", "n"], ["dieselGallonsForTest", "Diesel for Test (gal)", "n"]],
    fn: E.loadBank, ex: { generatorKw: 500, loadType: 0, voltage: 480, phase: 1, testHours: 4 },
    exText: (o) => `Example: a 500 kW, 480 V generator needs a ${o.recommendedLoadBankKw} kW load bank; at full load it draws ${o.ampsAt100} A, and a 4-hour stepped test burns about ${o.dieselGallonsForTest} gal of diesel.`,
    how: "Enter the generator's kW rating, voltage and phase, and how long the stepped test will run.",
    assume: "Equal time at each step; diesel use ≈ kW × (0.016 + 0.059 × load) gal/h. NFPA 110 requires monthly exercise at ≥30% load or an annual load bank test if that isn't met.",
    faq: [["Why load bank test a generator?", "To prove it can carry full load and burn off wet stacking (unburned fuel) from running lightly loaded."]],
  }),
  mk({
    slug: "line-to-line-fault-calculator", title: "Line-to-Line Fault Current Calculator",
    desc: "Calculate available short-circuit current — line-to-line and three-phase bolted fault at the transformer and at the end of a cable run — using the point-to-point method.",
    meta: "Line to Line Fault Calculator — Short Circuit Current",
    inputs: [dropdown("phase", "Transformer", opts(["Single-phase", "Three-phase"]), 1), num("kva", "Transformer kVA", 500, 10000, 0.5), num("voltage", "Secondary Voltage (V, L-L)", 480, 15000, 1, 120), num("impedance", "Transformer Impedance (%Z)", 5.75, 15, 0.05, 0.5), num("cableLength", "Cable Length to Fault (ft)", 100, 5000, 1), dropdown("cableSize", "Conductor Size (copper, steel conduit)", opts(WIRE_LABELS), 13), num("parallel", "Conductors in Parallel per Phase", 1, 12, 1, 1)],
    results: [["lineToLineFaultAmps", "Line-to-Line Fault at Cable End (A)", "n"], ["lineToLineKa", "Line-to-Line Fault at Cable End (kA)", "n"], ["threePhaseFaultAmps", "3-Phase Fault at Cable End (A)", "n"], ["lineToLineAtTransformer", "Line-to-Line at Transformer (A)", "n"], ["threePhaseAtTransformer", "3-Phase at Transformer (A)", "n"], ["fullLoadAmps", "Transformer Full-Load Amps", "n"]],
    fn: E.lineToLineFault, ex: { phase: 1, kva: 500, voltage: 480, impedance: 5.75, cableLength: 100, cableSize: 13, parallel: 1 },
    exText: (o) => `Example: a 500 kVA, 480 V, 5.75%Z transformer can deliver ${fmt(o.threePhaseAtTransformer, 0)} A three-phase and ${fmt(o.lineToLineAtTransformer, 0)} A line-to-line; 100 ft of 250 kcmil drops the L-L fault to ${fmt(o.lineToLineFaultAmps, 0)} A.`,
    how: "Enter the transformer nameplate data and the feeder to the fault point. The infinite-bus assumption (unlimited utility) gives a conservative maximum.",
    assume: "Point-to-point method: I = FLA ÷ %Z, L-L = 0.866 × 3φ; f = 2·L·I ÷ (C·n·E) for L-L, √3·L·I ÷ (C·n·E) for 3φ; I_end = I ÷ (1 + f). C values for copper in steel conduit, 600 V. Motor contribution is ignored.",
    faq: [["Why calculate line-to-line fault current?", "Line-to-line faults are lower than three-phase faults and are used to check that breakers trip quickly and for arc-flash studies."]],
  }),
  mk({
    slug: "pole-loading-calculator", title: "Utility Pole Loading Calculator",
    desc: "Check a wood utility pole's transverse wind loading — wind on the pole and up to three wire groups with ice — factored groundline moment versus the pole's capacity.",
    meta: "Pole Loading Calculator — Wood Pole Wind Load Check",
    inputs: [num("heightAboveGround", "Pole Height Above Ground (ft)", 34, 120, 0.5), num("groundlineCircumference", "Groundline Circumference (in)", 37, 120, 0.5), num("topCircumference", "Top Circumference (in)", 21, 60, 0.5), dropdown("species", "Species", opts(E.POLE_WOOD.map(([n, f]) => `${n} (${f.toLocaleString("en-US")} psi)`)), 0), num("windPressure", "Wind Pressure (psf)", 4, 40, 0.5), num("iceThickness", "Radial Ice (in)", 0.5, 2, 0.05), num("span", "Average Span (ft)", 250, 1000, 5), num("overloadFactor", "Overload Factor (NESC Grade B wind 2.5)", 2.5, 5, 0.1, 1), ...[1, 2, 3].flatMap((i) => [num(`wireCount${i}`, `Wire Group ${i} — Count`, [3, 1, 2][i - 1], 20), num(`wireDiameter${i}`, `Wire Group ${i} — Diameter (in)`, [0.72, 0.5, 0.6][i - 1], 5, 0.01), num(`wireHeight${i}`, `Wire Group ${i} — Height Above Ground (ft)`, [33, 28, 22][i - 1], 120, 0.5)])],
    results: [["utilizationPercent", "Pole Utilization", "p"], ["passes", "Passes (1 = yes)", "n"], ["factoredMomentFtLb", "Factored Groundline Moment (ft-lb)", "n"], ["momentCapacityFtLb", "Moment Capacity (ft-lb)", "n"], ["poleWindMomentFtLb", "Pole Wind Moment (ft-lb, unfactored)", "n"], ["wireWindMomentFtLb", "Wire Wind Moment (ft-lb, unfactored)", "n"], ["groundlineDiameterIn", "Groundline Diameter (in)", "n"]],
    fn: E.poleLoading, ex: { heightAboveGround: 34, groundlineCircumference: 37, topCircumference: 21, species: 0, windPressure: 4, iceThickness: 0.5, span: 250, overloadFactor: 2.5, wireCount1: 3, wireDiameter1: 0.72, wireHeight1: 33, wireCount2: 1, wireDiameter2: 0.5, wireHeight2: 28, wireCount3: 2, wireDiameter3: 0.6, wireHeight3: 22 },
    exText: (o) => `Example: a southern pine pole standing 34 ft above ground carrying three primaries, a neutral and two communication cables under NESC heavy loading is at ${o.utilizationPercent}% of capacity.`,
    how: "Enter the pole dimensions (circumference at groundline and top), species, loading district values and each wire group's count, diameter and attachment height.",
    assume: "Transverse wind only (no angle, guy or vertical loads); pole force acts at the centroid of its tapered profile; capacity = fiber stress × π d³ ÷ 32. NESC heavy district: 4 psf wind with 0.5 in ice. Use O-Calc or SPIDA for real designs.",
    faq: [["What is pole loading analysis?", "A check that a utility pole's strength exceeds the factored loads from wind, ice and attached equipment per the NESC."]],
  }),
  mk({
    slug: "generator-size-calculator", title: "Generator Size Calculator",
    desc: "Find the right generator size for a home or business — running watts, starting surge from the biggest motor, safety margin and the recommended kW.",
    meta: "Generator Size Calculator — What Size Generator Do I Need",
    inputs: [...E.GEN_LOADS.map(([n, r, s], i) => num(`load${i}`, `${n} (${r} W run / ${s} W start) — qty`, [1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0][i], 20)), num("lightsWatts", "Lights & Electronics (W)", 800, 100000, 10), num("otherRunningWatts", "Other Running Loads (W)", 0, 1000000, 10), yn("softStart", "Soft Starter on Largest Motor (halves surge)?"), pct("margin", "Safety Margin", 25, 100, 1)],
    results: [["recommendedKw", "Recommended Generator (kW)", "n"], ["requiredKw", "Required kW", "n"], ["runningWatts", "Running Watts", "n"], ["startingWatts", "Peak Starting Watts", "n"], ["largestSurgeWatts", "Largest Motor Surge (W)", "n"]],
    fn: E.generatorSize, ex: { load0: 1, load1: 0, load2: 1, load3: 0, load4: 1, load5: 0, load6: 0, load7: 0, load8: 1, load9: 0, load10: 0, load11: 0, load12: 0, load13: 0, lightsWatts: 800, otherRunningWatts: 0, softStart: 0, margin: 25 },
    exText: (o) => `Example: a fridge, sump pump, furnace fan, microwave and 800 W of lights run at ${fmt(o.runningWatts, 0)} W and peak at ${fmt(o.startingWatts, 0)} W when the sump pump starts — a ${o.recommendedKw} kW generator covers it.`,
    how: "Enter how many of each appliance you want to run at once. Use nameplate watts for anything not listed.",
    assume: "Peak = running watts + the single largest starting surge (motors start one at a time). Typical wattages from generator manufacturer charts; size up for central AC without a soft starter.",
    faq: [["What size generator do I need to run my house?", "Essentials usually need 5–8 kW portable; whole-home standby with central AC typically needs 20–26 kW."]],
  }),
  mk({
    slug: "generator-fuel-consumption-calculator", title: "Generator Fuel Consumption Calculator",
    desc: "Estimate generator fuel use — diesel, propane, natural gas or gasoline — per hour and per day at any load, fuel cost, runtime on a tank and cost per kWh.",
    inputs: [num("generatorKw", "Generator Rating (kW)", 22, 5000, 0.5), dropdown("fuel", "Fuel", opts(E.GEN_FUEL.map(([n]) => n)), 1), pct("loadPercent", "Average Load", 50, 100, 5), num("hoursPerDay", "Hours per Day", 24, 24, 0.5), cur("fuelPrice", "Fuel Price per Unit (gal or cu ft)", 2.8, 20, 0.001), num("tankSize", "Tank Size (gal; 0 for natural gas)", 500, 100000, 1)],
    results: [["fuelPerHour", "Fuel per Hour (gal or cu ft)", "n"], ["fuelPerDay", "Fuel per Day", "n"], ["costPerDay", "Fuel Cost per Day", "c"], ["runtimeHoursOnTank", "Runtime on Tank (hours)", "n"], ["kwhPerUnitFuel", "kWh per Unit of Fuel", "n"], ["costPerKwh", "Fuel Cost per kWh", "c"]],
    fn: E.generatorFuel, ex: { generatorKw: 22, fuel: 1, loadPercent: 50, hoursPerDay: 24, fuelPrice: 2.8, tankSize: 500 },
    exText: (o) => `Example: a 22 kW propane standby generator at 50% load burns about ${o.fuelPerHour} gal/h (${fmt(o.fuelPerDay, 0)} gal a day, ${usd(o.costPerDay)}); a 500 gal tank (80% usable) lasts about ${fmt(o.runtimeHoursOnTank, 0)} hours.`,
    how: "Enter the rating, fuel, average load and your fuel price. Propane tanks are filled to 80%.",
    assume: "Consumption = kW × (a + b × load): diesel 0.016 + 0.059, propane 0.05 + 0.112 gal; natural gas 4.6 + 9.6 cu ft; gasoline 0.03 + 0.09 gal — fitted to typical manufacturer spec sheets.",
    faq: [["How much propane does a 22 kW generator use?", "About 2.3 gal/h at half load and 3.6 gal/h at full load."]],
  }),
  mk({
    slug: "propane-usage-calculator", title: "Propane Usage Calculator",
    desc: "Estimate propane use from your appliances' BTU ratings and hours of use — gallons per day and month, monthly cost and how long your tank will last.",
    inputs: [num("furnaceBtu", "Furnace (BTU/h)", 80000, 500000, 1000), num("furnaceHours", "Furnace Run Hours per Day", 6, 24, 0.5), num("waterHeaterBtu", "Water Heater (BTU/h)", 40000, 300000, 1000), num("waterHeaterHours", "Water Heater Hours per Day", 2, 24, 0.25), num("rangeBtu", "Range / Cooktop (BTU/h)", 30000, 150000, 1000), num("rangeHours", "Range Hours per Day", 1, 24, 0.25), num("dryerBtu", "Dryer (BTU/h)", 22000, 50000, 1000), num("dryerHours", "Dryer Hours per Day", 0.5, 24, 0.25), num("fireplaceBtu", "Fireplace / Space Heater (BTU/h)", 25000, 100000, 1000), num("fireplaceHours", "Fireplace Hours per Day", 0, 24, 0.5), num("otherBtu", "Other (pool heater, generator…) BTU/h", 0, 1000000, 1000), num("otherHours", "Other Hours per Day", 0, 24, 0.5), num("tankGallons", "Tank Size (gal)", 500, 30000, 1), pct("currentFillPercent", "Current Tank Gauge", 80, 80, 1), cur("pricePerGallon", "Price per Gallon", 2.8, 10, 0.01)],
    results: [["gallonsPerDay", "Gallons per Day", "n"], ["gallonsPerMonth", "Gallons per Month", "n"], ["costPerMonth", "Cost per Month", "c"], ["daysTankLasts", "Days a Full Tank Lasts", "n"], ["daysUntilEmpty", "Days Until Empty (current gauge)", "n"], ["btuPerDay", "BTU per Day", "n"]],
    fn: E.propaneUsage, ex: { furnaceBtu: 80000, furnaceHours: 6, waterHeaterBtu: 40000, waterHeaterHours: 2, rangeBtu: 30000, rangeHours: 1, dryerBtu: 22000, dryerHours: 0.5, fireplaceBtu: 25000, fireplaceHours: 0, otherBtu: 0, otherHours: 0, tankGallons: 500, currentFillPercent: 80, pricePerGallon: 2.8 },
    exText: (o) => `Example: a winter day with the furnace running 6 hours plus water heating and cooking uses about ${o.gallonsPerDay} gal of propane — ${fmt(o.gallonsPerMonth, 0)} gal (${usd(o.costPerMonth)}) a month; a full 500 gal tank lasts about ${fmt(o.daysTankLasts, 0)} days.`,
    how: "Enter each appliance's input rating (on the nameplate) and typical burner run hours per day — winter furnace run time is often 4–10 hours.",
    assume: "1 gallon of propane = 91,500 BTU. Tanks are filled to 80%; gauges read percent of total capacity.",
    faq: [["How long does a 500 gallon propane tank last?", "About 1–3 months in winter for a home heated with propane, much longer for cooking and hot water only."]],
  }),
  mk({
    slug: "heat-pump-vs-furnace-calculator", title: "Heat Pump vs Furnace Cost Calculator",
    desc: "Compare annual heating cost of a heat pump against a gas, propane or oil furnace — seasonal COP from HSPF2, fuel and electricity prices, extra install cost and payback.",
    meta: "Heat Pump Installation Cost & Savings vs Furnace",
    inputs: [num("sqFt", "Home Size (sq ft)", 2000, 50000, 10), CLIMATE, num("annualMmbtu", "Or Annual Heat Load (MMBtu, 0 = estimate)", 0, 10000, 0.5), dropdown("furnaceFuel", "Furnace Fuel", opts(["Natural gas ($/therm)", "Propane ($/gal)", "Heating oil ($/gal)"]), 0), pct("afue", "Furnace AFUE", 95, 100, 0.5), cur("fuelPrice", "Fuel Price per Unit", 1.45, 10, 0.01), num("hspf2", "Heat Pump HSPF2", 7.8, 15, 0.1, 6), cur("electricRate", "Electricity Price per kWh", 0.17, 1, 0.005), cur("heatPumpInstalled", "Heat Pump Installed Cost", 14000, 100000, 100), cur("furnaceInstalled", "Furnace (+ AC) Installed Cost", 11000, 100000, 100), cur("rebates", "Heat Pump Rebates / Credits", 0, 50000, 50)],
    results: [["annualSavings", "Annual Savings with Heat Pump", "c"], ["heatPumpAnnualCost", "Heat Pump Annual Heating Cost", "c"], ["furnaceAnnualCost", "Furnace Annual Heating Cost", "c"], ["extraUpfrontCost", "Extra Upfront Cost for Heat Pump", "c"], ["paybackYears", "Payback (years)", "n"], ["seasonalCop", "Seasonal COP", "n"], ["heatPumpKwh", "Heat Pump kWh per Year", "n"], ["annualHeatLoadMmbtu", "Annual Heat Load (MMBtu)", "n"]],
    fn: E.heatPumpVsFurnace, ex: { sqFt: 2000, climate: 1, annualMmbtu: 0, furnaceFuel: 0, afue: 95, fuelPrice: 1.45, hspf2: 7.8, electricRate: 0.17, heatPumpInstalled: 14000, furnaceInstalled: 11000, rebates: 0 },
    exText: (o) => `Example: heating a 2,000 sq ft home in a moderate climate (${o.annualHeatLoadMmbtu} MMBtu) costs about ${usd(o.furnaceAnnualCost)} with gas at $1.45/therm versus ${usd(o.heatPumpAnnualCost)} with an HSPF2 7.8 heat pump.`,
    how: "Enter your home size and climate (or a known heat load), fuel and electricity prices and quotes for both systems.",
    assume: "Heat load estimates: 15–60 MBtu per sq ft per year by climate. Seasonal COP = HSPF2 ÷ 3.412. The federal §25C credit expired for equipment installed after 2025; check state and utility rebates.",
    faq: [["Is a heat pump cheaper to run than a gas furnace?", "It depends on local prices; heat pumps usually beat propane and oil, and beat gas where electricity is cheap relative to gas."]],
  }),
  mk({
    slug: "oil-gas-royalty-calculator", title: "Oil & Gas Royalty Calculator",
    desc: "Calculate oil and gas royalty income — net revenue interest from royalty rate and acreage, monthly and annual royalties after post-production deductions and severance tax.",
    meta: "Oil and Gas Royalty Calculator — Mineral Rights Income",
    inputs: [pct("royaltyRate", "Lease Royalty Rate", 18.75, 50, 0.01), num("netMineralAcres", "Your Net Mineral Acres", 40, 100000, 0.01), num("unitAcres", "Drilling Unit Size (acres)", 640, 100000, 1), num("oilBblPerMonth", "Unit Oil Production (bbl/month)", 12000, 10000000, 1), cur("oilPrice", "Oil Price per Barrel", 65, 300, 0.25), num("gasMcfPerMonth", "Unit Gas Production (mcf/month)", 30000, 100000000, 1), cur("gasPrice", "Gas Price per mcf", 3, 30, 0.01), pct("gasDeductions", "Post-Production Deductions (gas)", 15, 60, 0.5), pct("severanceTax", "Severance Tax", 4.6, 15, 0.1), num("valuationMultiple", "Valuation Multiple (× annual)", 5, 15, 0.25)],
    results: [["monthlyRoyalty", "Monthly Royalty", "c"], ["annualRoyalty", "Annual Royalty", "c"], ["netRevenueInterest", "Net Revenue Interest (decimal)", "n"], ["oilRoyalty", "Oil Royalty (gross, monthly)", "c"], ["gasRoyalty", "Gas Royalty (gross, monthly)", "c"], ["severanceTax", "Severance Tax", "c"], ["valueAt5xAnnual", "Indicative Value of Royalty", "c"]],
    fn: E.oilGasRoyalty, ex: { royaltyRate: 18.75, netMineralAcres: 40, unitAcres: 640, oilBblPerMonth: 12000, oilPrice: 65, gasMcfPerMonth: 30000, gasPrice: 3, gasDeductions: 15, severanceTax: 4.6, valuationMultiple: 5 },
    exText: (o) => `Example: 40 net acres in a 640-acre unit at an 18.75% royalty is a ${o.netRevenueInterest} NRI; with 12,000 bbl and 30,000 mcf a month that pays about ${usd(o.monthlyRoyalty)} a month.`,
    how: "Enter your lease royalty, your net mineral acres and the unit size, then the unit's monthly production and prices (state production databases publish well volumes).",
    assume: "Decimal interest = royalty × (net acres ÷ unit acres). Severance tax: Texas 4.6% oil / 7.5% gas; other states differ. Production declines steeply in early years.",
    faq: [["How are oil royalties calculated?", "Production × price × your decimal interest, minus taxes and any deductions allowed by your lease."]],
  }),
  mk({
    slug: "commercial-hvac-cost-calculator", title: "Commercial HVAC Cost Calculator",
    desc: "Estimate commercial HVAC installation or replacement cost — tonnage from building size, cost per ton by system (RTU, split, VRF, chiller, WSHP), ductwork, controls and crane.",
    inputs: [num("sqFt", "Building Area (sq ft)", 10000, 10000000, 10), num("sqFtPerTon", "Sq Ft per Ton (office ~350, retail ~300)", 350, 1000, 5, 100), num("tonsOverride", "Or Tonnage (0 = estimate)", 0, 100000, 0.5), dropdown("system", "System Type", opts(E.HVAC_SYSTEMS.map(([n, c]) => `${n} (~$${c.toLocaleString("en-US")}/ton)`)), 0), dropdown("project", "Project", opts(["Replacement", "New construction / new system"]), 0), yn("newDuctwork", "New Ductwork?"), cur("ductPerSqFt", "Ductwork per Sq Ft", 8, 50, 0.25), cur("controls", "Controls / BAS", 6000, 10000000, 100), cur("craneAndPermits", "Crane, Permits & Startup", 5000, 1000000, 100), region],
    results: [["totalCost", "Estimated Total Cost", "c"], ["tonnage", "Tonnage", "n"], ["equipmentAndInstall", "Equipment & Installation", "c"], ["ductwork", "Ductwork", "c"], ["costPerTon", "Cost per Ton", "c"], ["costPerSqFt", "Cost per Sq Ft", "c"], ["lowEstimate", "Low Estimate", "c"], ["highEstimate", "High Estimate", "c"]],
    fn: E.commercialHvac, ex: { sqFt: 10000, sqFtPerTon: 350, tonsOverride: 0, system: 0, project: 0, newDuctwork: 0, ductPerSqFt: 8, controls: 6000, craneAndPermits: 5000, regionAdjust: 0 },
    exText: (o) => `Example: replacing rooftop units on a 10,000 sq ft office (~${o.tonnage} tons) costs about ${usd(o.totalCost)} — ${usd(o.costPerTon)} per ton.`,
    how: "Enter the building area and typical square feet per ton for your use (or known tonnage), the system type and whether ducts are new.",
    assume: "2026 typical installed costs per ton: RTU $2,000–3,500, split $2,500–4,000, VRF $4,000–6,000, chiller plant $5,500–9,000. New systems run ~25% more than like-for-like replacement.",
    faq: [["How much does a commercial HVAC system cost?", "Commonly $15–35 per sq ft for new systems and $2,000–4,000 per ton for rooftop replacements."]],
  }),
  mk({
    slug: "natural-gas-calculator", title: "Natural Gas Conversion Calculator (MCF, Therms, BTU)",
    desc: "Convert natural gas between cubic feet, CCF, MCF, therms, MMBtu, cubic meters and kWh using your heat content — and price it per therm.",
    meta: "MCF & Natural Gas Conversion Calculator — Therms, BTU, CCF",
    inputs: [num("amount", "Amount", 10, 1000000000, 0.001), dropdown("unit", "Unit", opts(["Cubic feet", "CCF (100 cu ft)", "MCF (1,000 cu ft)", "Therms", "MMBtu (dekatherms)", "Cubic meters", "kWh (energy)", "MMcf (million cu ft)"]), 2), num("heatContent", "Heat Content (BTU per cu ft)", 1038, 1200, 1, 900), cur("pricePerTherm", "Price per Therm", 1.25, 20, 0.01)],
    results: [["therms", "Therms", "n"], ["mcf", "MCF", "n"], ["ccf", "CCF", "n"], ["mmbtu", "MMBtu", "n"], ["cubicFeet", "Cubic Feet", "n"], ["cubicMeters", "Cubic Meters", "n"], ["kwhEquivalent", "kWh Equivalent", "n"], ["totalCost", "Cost", "c"]],
    fn: E.naturalGas, ex: { amount: 10, unit: 2, heatContent: 1038, pricePerTherm: 1.25 },
    exText: (o) => `Example: 10 MCF of gas at 1,038 BTU/cf is ${o.therms} therms (${o.mmbtu} MMBtu) — about ${usd(o.totalCost)} at $1.25 a therm.`,
    how: "Enter an amount and its unit. Your gas bill shows the heat content (therm factor) used for billing.",
    assume: "1 therm = 100,000 BTU; 1 MMBtu = 10 therms; US average heat content ≈ 1,038 BTU per cubic foot (EIA). 1 kWh = 3,412 BTU.",
    faq: [["How many therms are in an MCF?", "About 10.4 therms at 1,038 BTU per cubic foot."]],
  }),
  mk({
    slug: "annular-volume-calculator", title: "Annular Volume Calculator",
    desc: "Calculate annular volume between a wellbore (or casing) and pipe — barrels per foot, total barrels, gallons and cubic feet — and cement sacks with slurry yield and excess.",
    inputs: [num("holeDiameter", "Hole / Casing ID (in)", 8.75, 48, 0.001), num("pipeOd", "Pipe / Casing OD (in)", 5.5, 40, 0.001), num("length", "Interval Length (ft)", 1000, 50000, 1), pct("excess", "Excess (open hole)", 25, 200, 1), num("slurryYield", "Cement Slurry Yield (cu ft/sack)", 1.18, 4, 0.01, 0.5)],
    results: [["annularVolumeBbl", "Annular Volume (bbl)", "n"], ["bblPerFoot", "Capacity (bbl/ft)", "n"], ["ftPerBbl", "Feet per Barrel", "n"], ["gallons", "Gallons", "n"], ["cubicFeet", "Cubic Feet", "n"], ["cementSacks", "Cement Sacks", "n"]],
    fn: E.annularVolume, ex: { holeDiameter: 8.75, pipeOd: 5.5, length: 1000, excess: 25, slurryYield: 1.18 },
    exText: (o) => `Example: 5.5 in casing in an 8.75 in hole holds ${o.bblPerFoot} bbl/ft; 1,000 ft with 25% excess is ${o.annularVolumeBbl} bbl (${fmt(o.cubicFeet, 0)} cu ft) — ${o.cementSacks} sacks of Class G at 1.18 cu ft/sk.`,
    how: "Enter the hole or outer casing inside diameter, the inner pipe OD and the interval. Use caliper logs for open-hole excess.",
    assume: "Annular capacity (bbl/ft) = (D² − d²) ÷ 1,029.4; 1 bbl = 42 gal = 5.6146 cu ft.",
    faq: [["How do you calculate annular volume?", "(Hole ID² − pipe OD²) ÷ 1,029.4 gives barrels per foot; multiply by length."]],
  }),
  mk({
    slug: "oil-vs-gas-heating-cost-calculator", title: "Oil vs Gas Heating Cost Calculator",
    desc: "Compare annual heating costs of heating oil and natural gas — by home size and climate or known heat load, furnace efficiencies, fuel prices — and the payback on converting.",
    inputs: [num("sqFt", "Home Size (sq ft)", 2000, 50000, 10), CLIMATE, num("annualMmbtu", "Or Annual Heat Load (MMBtu, 0 = estimate)", 0, 10000, 0.5), cur("oilPrice", "Heating Oil per Gallon", 3.75, 10, 0.01), pct("oilAfue", "Oil Furnace / Boiler AFUE", 84, 100, 0.5), cur("gasPrice", "Natural Gas per Therm", 1.45, 10, 0.01), pct("gasAfue", "Gas Furnace AFUE", 95, 100, 0.5), cur("gasMonthlyCharge", "Gas Customer Charge per Month", 15, 200, 0.5), cur("conversionCost", "Oil-to-Gas Conversion Cost", 9000, 100000, 100)],
    results: [["annualSavingsWithGas", "Annual Savings with Gas", "c"], ["oilAnnualCost", "Oil Annual Cost", "c"], ["gasAnnualCost", "Gas Annual Cost", "c"], ["oilGallons", "Oil per Year (gal)", "n"], ["gasTherms", "Gas per Year (therms)", "n"], ["conversionPaybackYears", "Conversion Payback (years)", "n"], ["annualHeatLoadMmbtu", "Annual Heat Load (MMBtu)", "n"]],
    fn: E.oilVsGas, ex: { sqFt: 2000, climate: 2, annualMmbtu: 0, oilPrice: 3.75, oilAfue: 84, gasPrice: 1.45, gasAfue: 95, gasMonthlyCharge: 15, conversionCost: 9000 },
    exText: (o) => `Example: a 2,000 sq ft home in a cold climate uses about ${fmt(o.oilGallons, 0)} gal of oil (${usd(o.oilAnnualCost)}) or ${fmt(o.gasTherms, 0)} therms of gas (${usd(o.gasAnnualCost)}) — converting pays back in about ${o.conversionPaybackYears} years.`,
    how: "Enter your home size and climate (or last year's oil gallons × 0.1385 × AFUE as MMBtu), current prices and a conversion quote.",
    assume: "Heating oil 138,500 BTU/gal; natural gas 100,000 BTU/therm. Heat loads are rule-of-thumb by climate.",
    faq: [["Is natural gas cheaper than oil for heating?", "Usually — per million BTU delivered, gas has typically cost 30–50% less than heating oil."]],
  }),
  mk({
    slug: "vcf-calculator", title: "VCF Calculator (Petroleum Volume Correction Factor)",
    desc: "Calculate the volume correction factor (VCF) to correct crude oil and refined product volumes to 60 °F — from API gravity and observed temperature — with net standard volume.",
    meta: "VCF Calculator — Petroleum Volume Correction to 60 °F",
    inputs: [dropdown("product", "Product (API table)", opts(E.VCF_TABLES.map(([n]) => n)), 0), num("api", "API Gravity at 60 °F", 35, 100, 0.1, 0), num("temperature", "Observed Temperature (°F)", 80, 300, 0.1, -50), num("grossVolume", "Gross Observed Volume (bbl or gal)", 10000, 100000000, 0.01)],
    results: [["vcf", "Volume Correction Factor (VCF)", "n"], ["netVolumeAt60F", "Net Standard Volume at 60 °F", "n"], ["volumeChange", "Volume Change", "n"], ["alphaPerF", "Thermal Expansion Coefficient (per °F)", "n"], ["densityKgM3", "Density at 60 °F (kg/m³)", "n"], ["specificGravity", "Specific Gravity", "n"]],
    fn: E.vcf, ex: { product: 0, api: 35, temperature: 80, grossVolume: 10000 },
    exText: (o) => `Example: 10,000 bbl of 35° API crude at 80 °F has a VCF of ${o.vcf}, so the net standard volume is ${fmt(o.netVolumeAt60F, 2)} bbl.`,
    how: "Choose the product group, enter API gravity at 60 °F and the observed temperature, and the gross observed volume.",
    assume: "API MPMS 11.1 / ASTM D1250 (1980 Table 6A/6B/6D form): α60 = K0/ρ² + K1/ρ; VCF = exp(−α ΔT (1 + 0.8 α ΔT)). Custody transfer must use the current API MPMS 11.1 implementation (results agree to about ±0.0005).",
    faq: [["What is VCF in oil measurement?", "The factor that converts a volume measured at actual temperature to its volume at the 60 °F standard."]],
  }),
  mk({
    slug: "texas-electricity-cost-calculator", title: "Texas Electricity Bill Calculator",
    desc: "Estimate a Texas electric bill in deregulated areas — retail energy rate, base charge, TDU delivery charges (Oncor, CenterPoint, AEP, TNMP), bill credits and fees — with the all-in ¢/kWh.",
    meta: "Electric Bill Calculator Texas — Plan Cost per kWh",
    inputs: [num("monthlyKwh", "Monthly Usage (kWh)", 1000, 20000, 10), num("energyCents", "Energy Charge (¢ per kWh)", 9.5, 50, 0.01), cur("baseCharge", "Retailer Base Charge per Month", 4.95, 50, 0.01), dropdown("tdu", "Delivery Area (TDU)", opts(["Oncor (DFW)", "CenterPoint (Houston)", "AEP Texas Central", "AEP Texas North", "TNMP", "Custom"]), 0), cur("customTduFixed", "Custom TDU Fixed $/month", 4, 50, 0.01), cur("customTduRate", "Custom TDU $/kWh", 0.055, 1, 0.0001), cur("billCredit", "Bill Credit", 0, 500, 1), num("creditThreshold", "Bill Credit Usage Threshold (kWh)", 1000, 5000, 50), pct("feesPercent", "Taxes & Fees (gross receipts, PUC)", 2, 15, 0.1)],
    results: [["monthlyBill", "Estimated Monthly Bill", "c"], ["allInCentsPerKwh", "All-In Price (¢/kWh)", "n"], ["energyCharge", "Energy Charge", "c"], ["deliveryCharges", "TDU Delivery Charges", "c"], ["baseCharge", "Base Charge", "c"], ["billCredit", "Bill Credit", "c"], ["taxesAndFees", "Taxes & Fees", "c"], ["annualCost", "Annual Cost (at this usage)", "c"]],
    fn: E.texasElectricity, ex: { monthlyKwh: 1000, energyCents: 9.5, baseCharge: 4.95, tdu: 0, customTduFixed: 4, customTduRate: 0.055, billCredit: 0, creditThreshold: 1000, feesPercent: 2 },
    exText: (o) => `Example: 1,000 kWh on a 9.5¢ plan in Oncor territory costs about ${usd(o.monthlyBill)} — ${o.allInCentsPerKwh}¢ per kWh all-in once delivery charges are added.`,
    how: "Copy the energy charge, base charge and any bill credit from your plan's Electricity Facts Label (EFL), choose your delivery utility and enter your usage.",
    assume: "TDU charges are approximate 2026 residential rates (fixed + per-kWh) and change each March and September. Residential electricity is exempt from Texas state sales tax; local fees vary.",
    faq: [["How do I compare Texas electricity plans?", "Use the EFL's average price at your usage level, and watch for bill credits that only apply in a narrow usage range."]],
  }),
  mk({
    slug: "cable-bundle-diameter-calculator", title: "Cable Bundle Diameter Calculator",
    desc: "Calculate the overall diameter of a bundle of round cables, cable cross-sectional area and conduit fill percentage against NEC fill limits.",
    inputs: [num("cables", "Number of Cables", 7, 1000, 1, 1), num("cableDiameter", "Cable Outside Diameter (in)", 0.25, 5, 0.001), pct("allowance", "Allowance for Lay / Ties", 5, 30, 1), num("conduitId", "Conduit Inside Diameter (in, 0 = skip)", 1.049, 6, 0.001)],
    results: [["bundleDiameterIn", "Bundle Diameter (in)", "n"], ["bundleDiameterMm", "Bundle Diameter (mm)", "n"], ["totalCableAreaSqIn", "Total Cable Area (sq in)", "n"], ["conduitFillPercent", "Conduit Fill", "p"], ["necFillLimitPercent", "NEC Fill Limit (%)", "n"], ["withinFill", "Within NEC Fill (1 = yes)", "n"]],
    fn: E.cableBundle, ex: { cables: 7, cableDiameter: 0.25, allowance: 5, conduitId: 1.049 },
    exText: (o) => `Example: seven 0.25 in cables bundle to about ${o.bundleDiameterIn} in (${o.bundleDiameterMm} mm) and fill ${o.conduitFillPercent}% of a 1 in EMT (limit ${o.necFillLimitPercent}%).`,
    how: "Enter the number and outside diameter of identical round cables. For conduit fill, enter the trade size's internal diameter (e.g. 1 in EMT = 1.049 in).",
    assume: "Ideal circle packing for 1–12 cables; beyond that ≈ 1.15 × d × √n. NEC Chapter 9 fill: 53% one cable, 31% two, 40% three or more.",
    faq: [["How do you calculate cable bundle diameter?", "For many identical cables, bundle diameter ≈ 1.15 × cable diameter × √(number of cables)."]],
  }),
  mk({
    slug: "sccr-calculator", title: "SCCR Rating Calculator (Industrial Control Panel)",
    desc: "Determine an industrial control panel's short-circuit current rating (SCCR) from its power-circuit components and check it against the available fault current.",
    meta: "SCCR Rating Calculator — Control Panel vs Available Fault",
    inputs: [...[1, 2, 3, 4, 5, 6].map((i) => num(`component${i}`, `Component ${i} SCCR / Interrupting Rating (kA, 0 = none)`, [65, 100, 5, 10, 65, 0][i - 1], 300, 0.5)), num("availableFault", "Available Fault Current at Panel (kA)", 22, 300, 0.1)],
    results: [["panelSccrKa", "Panel SCCR (kA)", "n"], ["lowestComponentKa", "Lowest Component Rating (kA)", "n"], ["availableFaultKa", "Available Fault Current (kA)", "n"], ["adequate", "SCCR ≥ Available Fault (1 = yes)", "n"], ["marginKa", "Margin (kA)", "n"]],
    fn: E.sccr, ex: { component1: 65, component2: 100, component3: 5, component4: 10, component5: 65, component6: 0, availableFault: 22 },
    exText: (o) => `Example: with a 5 kA contactor in the power circuit the panel SCCR is ${o.panelSccrKa} kA — below the 22 kA available, so it fails (margin ${o.marginKa} kA) unless that component gets a tested higher-rated combination.`,
    how: "Enter the SCCR or interrupting rating of each power-circuit component (disconnect, branch protection, contactors, overloads, terminals) and the available fault current from the utility or your study.",
    assume: "Simplified UL 508A Supplement SB: the panel takes the lowest component rating unless a listed current-limiting device or tested combination raises it. NEC 409.110 requires the SCCR to be marked and to be at least the available fault current.",
    faq: [["What is SCCR?", "Short-circuit current rating — the maximum fault current a panel can safely withstand, required on industrial control panel nameplates."]],
  }),
];

async function main() {
  const cat = await prisma.toolCategory.findUnique({ where: { slug: CAT } });
  if (!cat) throw new Error(`The "${CAT}" category doesn't exist — run "npx tsx prisma/setup-business-industrial-category.ts --apply" first.`);

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: (await hgMovedCategoryId(prisma, def.slug)) ?? cat.id,
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

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated.`);
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
