// One-time (but safe to re-run) batch setup script: creates 28 freight, logistics & warehouse
// calculators (Business & Industrial Calculators > Freight, Logistics & Warehouse Calculators).
// Formulas and rate tables live in src/lib/calc-engine-biz-freight.ts; examples are computed from the
// engine. Merged keywords (no separate page): Transport Cost, Transportation Rate, Truck Rate →
// truckload-freight; International Freight → freight-forwarding-cost; Logistics Carbon → freight-
// emissions; Warehouse Cost → warehouse-storage-cost; Bulk Bag Capacity / Volume / Bulk Bag → bulk-bag.
// Near-namesakes kept distinct: the existing freight-shipping-cost-calculator prices LTL by class,
// truckload-freight prices full truckloads per mile; canada-moving-cost works in CAD/km with HST.
//
// HOW TO RUN (after prisma/setup-business-industrial-category.ts --apply)
//   npx tsx prisma/create-biz-freight-calculators.ts
// or
//   npm run db:create-biz-freight-calculators

import * as E from "../src/lib/calc-engine-biz-freight";

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

const CAT = "freight-logistics-warehouse-calculators";
const NOTE = "Freight rates, fees and surcharges move with fuel prices and market conditions — treat results as planning estimates and confirm with a carrier, forwarder or 3PL quote.";

const dateField = (key: string, label: string, def: number | string = "today") => ({ key, label, type: "date", required: true, default: def });
const region = pct("regionAdjust", "Local Price Adjustment (+/− %)", 0, 100, 1);
const SIZES = opts(E.HOME_SIZES.map(([n]) => n));

const TOOLS: ToolDef[] = [
  mk({
    slug: "freight-transit-time-calculator", title: "Freight Transit Time Calculator",
    desc: "Estimate freight transit time and arrival date for LTL, full truckload (solo or team), rail intermodal, domestic air, ocean and international air freight — plus pickup, customs and final-mile days.",
    meta: "Freight Transit Time Calculator — Truck, Rail, Ocean & Air",
    inputs: [dropdown("mode", "Mode", opts(["LTL truck", "FTL truck (solo driver)", "FTL truck (team drivers)", "Rail intermodal", "Domestic air freight", "Ocean freight (port to port)", "International air freight"]), 1), num("miles", "Distance (miles, domestic modes)", 1200, 6000, 10), dropdown("lane", "Trade Lane (ocean / international air)", opts(E.LANES.map(([n]) => n)), 0), dateField("shipDate", "Pickup / Ship Date"), num("pickupDays", "Pickup / Origin Handling Days", 0, 30), num("customsDays", "Customs Clearance Days", 0, 30), num("finalMileDays", "Final-Mile Delivery Days", 0, 30)],
    results: [["estimatedArrival", "Estimated Arrival", "d"], ["transitDays", "Line-Haul Transit (days)", "n"], ["totalDays", "Total Door-to-Door (days)", "n"], ["drivingHours", "Driving Hours (truck)", "n"]],
    fn: E.freightTransit, ex: { mode: 1, miles: 1200, lane: 0, shipDate: 20759, pickupDays: 0, customsDays: 0, finalMileDays: 0 },
    exText: (o) => `Example: 1,200 miles by a solo-driver truckload takes about ${o.transitDays} days (${o.drivingHours} h of driving at 50 mph within hours-of-service limits).`,
    how: "Choose the mode, enter the distance (or the trade lane for ocean and international air) and add any pickup, customs and delivery days.",
    assume: "Solo drivers cover ~500 mi a day and teams ~1,000 under FMCSA hours of service; LTL ~1 day per 400 mi plus terminal handling; intermodal ~1 day per 400 mi + 2. Ocean times are typical port-to-port averages and exclude port congestion.",
    faq: [["How long does LTL freight take?", "Usually 1–5 business days regionally and 5–7 days coast to coast."], ["How long is ocean freight from China to the US?", "About 14–18 days to the West Coast and 28–35 days to the East Coast, port to port."]],
  }),
  mk({
    slug: "truckload-freight-calculator", title: "Truckload (FTL) Freight & Truck Rate Calculator",
    desc: "Estimate a full truckload freight quote — rate per mile by equipment, fuel surcharge, stops and detention — and the carrier's cost per mile, profit and margin.",
    meta: "Truck Rate Calculator — FTL Freight Quote per Mile",
    inputs: [num("miles", "Loaded Miles", 800, 6000, 1), dropdown("equipment", "Equipment", opts(["Dry van (~$2.10/mi)", "Reefer (~$2.45/mi)", "Flatbed (~$2.60/mi)", "Step deck (~$2.35/mi)"]), 0), cur("ratePerMile", "Your Rate per Mile (0 = market average)", 0, 20, 0.01), yn("addFuelSurcharge", "Add Fuel Surcharge on Top (rate is linehaul only)?"), cur("dieselPrice", "Diesel Price per Gallon", 3.75, 10, 0.01), num("stops", "Extra Stops", 0, 20), cur("stopFee", "Fee per Extra Stop", 75, 1000, 5), num("detentionHours", "Billable Detention Hours", 0, 72, 0.5), cur("detentionRate", "Detention per Hour", 75, 500, 5), cur("otherAccessorials", "Other Accessorials (lumper, tarp…)", 0, 10000, 5), cur("minimum", "Minimum Charge", 450, 10000, 10), num("deadheadMiles", "Deadhead (empty) Miles — carrier view", 100, 3000, 1), num("mpg", "Truck MPG", 6.5, 12, 0.1, 3), cur("driverPayPerMile", "Driver Pay per Mile", 0.65, 3, 0.01), cur("otherCostPerMile", "Other Cost per Mile (truck, insurance, maint.)", 0.75, 5, 0.01)],
    results: [["totalQuote", "Total Freight Quote", "c"], ["allInRatePerMile", "All-In Rate per Mile", "c"], ["linehaul", "Linehaul", "c"], ["fuelSurcharge", "Fuel Surcharge", "c"], ["accessorials", "Accessorials", "c"], ["carrierCost", "Carrier Operating Cost", "c"], ["carrierProfit", "Carrier Profit", "c"], ["marginPercent", "Carrier Margin", "p"]],
    fn: E.truckload, ex: { miles: 800, equipment: 0, ratePerMile: 0, addFuelSurcharge: 0, dieselPrice: 3.75, stops: 0, stopFee: 75, detentionHours: 0, detentionRate: 75, otherAccessorials: 0, minimum: 450, deadheadMiles: 100, mpg: 6.5, driverPayPerMile: 0.65, otherCostPerMile: 0.75 },
    exText: (o) => `Example: an 800-mile dry van load at the ~$2.10 national average comes to ${usd(o.totalQuote)}; with 100 deadhead miles the carrier's cost is about ${usd(o.carrierCost)}, a ${o.marginPercent}% margin.`,
    how: "Enter loaded miles and equipment (or your own rate). Turn on the fuel surcharge only if your rate excludes fuel. Carrier inputs show whether the load pays.",
    assume: "Market rates are 2026 national spot averages including fuel (DAT-style). Fuel surcharge = (diesel − $1.25) ÷ 6 mpg per mile, a common shipper schedule.",
    faq: [["How are truckload rates calculated?", "Mostly rate per mile × miles, adjusted for equipment, lane demand, fuel and accessorials."], ["What is a good rate per mile for trucking?", "In 2026, dry van spot rates average around $2.00–2.30 per mile all-in; reefer and flatbed pay more."]],
  }),
  mk({
    slug: "freight-forwarding-cost-calculator", title: "Freight Forwarding & International Freight Cost Calculator",
    desc: "Build an international freight quote — air (chargeable weight), ocean LCL (per W/M) or FCL containers — plus origin, destination, customs, documents, insurance and forwarder margin.",
    meta: "Freight Forwarding Cost Calculator — International Freight Quote",
    inputs: [dropdown("mode", "Mode", opts(["Air freight", "Ocean LCL", "Ocean FCL"]), 1), num("weightKg", "Gross Weight (kg)", 1500, 1000000, 1), num("cbm", "Volume (m³)", 6, 10000, 0.1), cur("airRatePerKg", "Air Rate per Chargeable kg", 4.5, 100, 0.05), cur("lclRatePerWm", "LCL Rate per W/M", 85, 2000, 1), num("containers", "FCL Containers", 1, 500, 1, 1), cur("fclRatePerContainer", "FCL Rate per Container", 2800, 50000, 10), cur("originCharges", "Origin Charges (pickup, export, THC)", 350, 100000, 5), cur("destinationCharges", "Destination Charges (THC, delivery)", 450, 100000, 5), cur("customsClearance", "Customs Clearance / Brokerage", 175, 10000, 5), cur("documentation", "Documentation", 75, 5000, 5), cur("cargoValue", "Cargo Value", 40000, 100000000, 100), pct("insuranceRate", "Cargo Insurance Rate", 0.3, 5, 0.05), pct("forwarderMargin", "Forwarder Margin", 10, 50, 0.5)],
    results: [["totalCost", "Total Forwarding Cost", "c"], ["freightCharge", "Main Freight", "c"], ["localCharges", "Origin, Destination & Customs", "c"], ["cargoInsurance", "Cargo Insurance", "c"], ["forwarderMargin", "Forwarder Margin", "c"], ["chargeableQuantity", "Chargeable kg / W/M / Containers", "n"], ["costPerKg", "Cost per kg", "c"], ["costAsPercentOfCargo", "Logistics Cost % of Cargo Value", "p"]],
    fn: E.forwarding, ex: { mode: 1, weightKg: 1500, cbm: 6, airRatePerKg: 4.5, lclRatePerWm: 85, containers: 1, fclRatePerContainer: 2800, originCharges: 350, destinationCharges: 450, customsClearance: 175, documentation: 75, cargoValue: 40000, insuranceRate: 0.3, forwarderMargin: 10 },
    exText: (o) => `Example: 6 m³ / 1,500 kg moving LCL at $85 per W/M costs ${usd(o.freightCharge)} in ocean freight and ${usd(o.totalCost)} door to door — ${o.costAsPercentOfCargo}% of a $40,000 cargo.`,
    how: "Pick the mode and enter weight and volume, the main freight rate from your quote, and local charges at each end.",
    assume: "Air chargeable weight = greater of actual kg and 167 kg per m³ (1:6,000 cm³). LCL bills per revenue ton (greater of m³ and tonnes, min 1). Duties and import taxes are not included.",
    faq: [["What does a freight forwarder charge?", "Their margin is usually built into the freight rate plus fixed fees for documents, customs and handling."]],
  }),
  mk({
    slug: "freight-emissions-calculator", title: "Freight Emissions Calculator (Logistics Carbon)",
    desc: "Calculate CO2e emissions for a shipment by truck, LTL, van, rail, ocean, barge or air — tonne-km, kg and tonnes CO2e, carbon cost and comparison to truck.",
    meta: "Freight Emissions Calculator — Logistics Carbon Footprint",
    inputs: [dropdown("mode", "Transport Mode", opts(E.EMISSION_FACTORS.map(([n, f]) => `${n} (${f} kg/t-km)`)), 0), dropdown("weightUnit", "Weight Unit", opts(["Pounds", "Kilograms", "Metric tonnes"]), 0), num("weight", "Shipment Weight", 20000, 100000000, 1), dropdown("distanceUnit", "Distance Unit", opts(["Miles", "Kilometers"]), 0), num("distance", "Distance", 1000, 30000, 1), num("shipments", "Number of Shipments", 1, 1000000, 1, 1), cur("carbonPrice", "Carbon Price per Tonne (offset / internal)", 50, 1000, 1)],
    results: [["tonnesCo2e", "Emissions (tonnes CO2e)", "n"], ["kgCo2e", "Emissions (kg CO2e)", "n"], ["tonneKm", "Tonne-km", "n"], ["carbonCost", "Carbon Cost", "c"], ["treeYearsToOffset", "Tree-Years to Absorb", "n"], ["vsTruckPercent", "Intensity vs Truck (%)", "n"]],
    fn: E.freightEmissions, ex: { mode: 0, weightUnit: 0, weight: 20000, distanceUnit: 0, distance: 1000, shipments: 1, carbonPrice: 50 },
    exText: (o) => `Example: 20,000 lb trucked 1,000 miles is ${fmt(o.tonneKm, 0)} tonne-km — about ${o.tonnesCo2e} t CO2e. By rail the same move would be roughly 70% lower.`,
    how: "Choose the mode, enter the shipment weight and distance. For multi-leg moves, run each leg separately and add them up.",
    assume: "Well-to-wheel factors are typical GLEC Framework defaults; actual intensity varies with load factor, vehicle and fuel. A tree absorbs roughly 22 kg CO2 a year.",
    faq: [["Which freight mode has the lowest emissions?", "Ocean and rail are lowest per tonne-km; air freight is roughly 50 times higher than ocean."]],
  }),
  mk({
    slug: "drayage-rate-calculator", title: "Drayage Rate Calculator",
    desc: "Estimate container drayage cost from port or rail ramp to your warehouse — round-trip linehaul, fuel surcharge, chassis, waiting time, pre-pull, yard storage and accessorials.",
    inputs: [num("miles", "One-Way Miles (port → warehouse)", 25, 500, 1), cur("ratePerMile", "Rate per Round-Trip Mile", 6.5, 50, 0.05), cur("minimum", "Minimum Move Charge", 400, 5000, 5), pct("fuelSurcharge", "Fuel Surcharge", 25, 60, 0.5), num("chassisDays", "Chassis Days", 2, 60), cur("chassisRate", "Chassis per Day", 40, 200, 1), num("waitHours", "Total Waiting Hours (port + warehouse)", 3, 48, 0.5), num("freeHours", "Free Waiting Hours", 2, 8, 0.5), cur("waitRate", "Waiting Time per Hour", 85, 300, 5), yn("prePull", "Pre-Pull (to avoid demurrage)?"), cur("prePullFee", "Pre-Pull Fee", 175, 1000, 5), num("yardDays", "Yard Storage Days", 0, 60), cur("yardRate", "Yard Storage per Day", 50, 300, 5), yn("overweight", "Overweight (+$150)?"), yn("hazmat", "Hazmat (+$175)?"), cur("terminalFees", "Terminal / Clean-Truck Fees", 35, 1000, 1)],
    results: [["totalCost", "Total Drayage Cost", "c"], ["baseLinehaul", "Base Linehaul", "c"], ["fuelSurcharge", "Fuel Surcharge", "c"], ["chassisCharges", "Chassis", "c"], ["waitingTime", "Waiting Time", "c"], ["otherCharges", "Other Charges", "c"], ["costPerRoundTripMile", "Cost per Round-Trip Mile", "c"]],
    fn: E.drayage, ex: { miles: 25, ratePerMile: 6.5, minimum: 400, fuelSurcharge: 25, chassisDays: 2, chassisRate: 40, waitHours: 3, freeHours: 2, waitRate: 85, prePull: 0, prePullFee: 175, yardDays: 0, yardRate: 50, overweight: 0, hazmat: 0, terminalFees: 35 },
    exText: (o) => `Example: a 25-mile dray (50 round-trip miles) hits the $400 minimum; with 25% fuel, 2 chassis days and an hour of waiting it comes to about ${usd(o.totalCost)}.`,
    how: "Enter the one-way distance, the drayage carrier's rate and minimum, and expected chassis days, waiting time and extras.",
    assume: "Local port drayage is usually priced per move with a minimum; 2026 US port moves under 50 miles typically cost $350–800 before accessorials.",
    faq: [["What is drayage?", "Short-haul trucking of shipping containers between a port or rail ramp and a nearby warehouse."], ["What is a pre-pull?", "Pulling a container out of the port early to a yard to avoid port demurrage."]],
  }),
  mk({
    slug: "hot-shot-trucking-rate-calculator", title: "Hot Shot Trucking Rate Calculator",
    desc: "Price a hot shot load — rate per loaded mile, minimum and accessorials — and see fuel, operating cost, profit per mile and revenue per total mile including deadhead.",
    meta: "Hot Shot Rate Calculator — Price & Profit per Mile",
    inputs: [num("loadedMiles", "Loaded Miles", 400, 5000, 1), num("deadheadMiles", "Deadhead Miles", 120, 3000, 1), cur("ratePerMile", "Rate per Loaded Mile", 1.9, 10, 0.05), cur("minimum", "Minimum Charge", 350, 5000, 5), cur("accessorials", "Accessorials (tarps, extra stops)", 0, 5000, 5), num("mpg", "Truck MPG (loaded)", 10, 20, 0.1, 4), cur("dieselPrice", "Diesel Price", 3.75, 10, 0.01), cur("otherCostPerMile", "Other Cost per Mile (tires, maint., driver)", 0.55, 5, 0.01), cur("fixedCostPerDay", "Fixed Cost per Day (payments, insurance)", 110, 2000, 5)],
    results: [["quote", "Load Revenue", "c"], ["totalCost", "Total Trip Cost", "c"], ["profit", "Profit", "c"], ["fuelCost", "Fuel Cost", "c"], ["profitPerLoadedMile", "Profit per Loaded Mile", "c"], ["revenuePerTotalMile", "Revenue per Total Mile", "c"], ["daysOnRoad", "Days on the Road", "n"]],
    fn: E.hotShot, ex: { loadedMiles: 400, deadheadMiles: 120, ratePerMile: 1.9, minimum: 350, accessorials: 0, mpg: 10, dieselPrice: 3.75, otherCostPerMile: 0.55, fixedCostPerDay: 110 },
    exText: (o) => `Example: a 400-mile hot shot at $1.90 a mile pays ${usd(o.quote)}; with 120 deadhead miles the trip costs about ${usd(o.totalCost)}, leaving ${usd(o.profit)}.`,
    how: "Enter loaded and empty miles, the rate offered, and your truck's operating costs.",
    assume: "Hot shot rates in 2026 commonly run $1.50–2.50 per loaded mile. One driving day ≈ 550 miles for fixed-cost allocation.",
    faq: [["How much do hot shot drivers charge per mile?", "Typically $1.50–2.50 per loaded mile, more for expedited or short runs."]],
  }),
  mk({
    slug: "case-cube-calculator", title: "Case Cube Calculator",
    desc: "Calculate case cube (cubic feet per case), total cube, cases per pallet layer and per pallet on a 48 × 40 pallet, and pallets needed for an order.",
    inputs: [num("length", "Case Length (in)", 16, 100, 0.125), num("width", "Case Width (in)", 12, 100, 0.125), num("height", "Case Height (in)", 10, 100, 0.125), num("cases", "Number of Cases", 500, 10000000), num("palletLength", "Pallet Length (in)", 48, 60, 1, 24), num("palletWidth", "Pallet Width (in)", 40, 60, 1, 24), num("maxHeight", "Max Load Height incl. Pallet (in)", 60, 108, 1, 20)],
    results: [["cubePerCaseCuFt", "Case Cube (cu ft)", "n"], ["totalCubicFeet", "Total Cube (cu ft)", "n"], ["totalCubicMeters", "Total Cube (m³)", "n"], ["casesPerLayer", "Cases per Layer", "n"], ["layersPerPallet", "Layers per Pallet", "n"], ["casesPerPallet", "Cases per Pallet", "n"], ["palletsNeeded", "Pallets Needed", "n"]],
    fn: E.caseCube, ex: { length: 16, width: 12, height: 10, cases: 500, palletLength: 48, palletWidth: 40, maxHeight: 60 },
    exText: (o) => `Example: a 16 × 12 × 10 in case is ${o.cubePerCaseCuFt} cu ft; ${o.casesPerLayer} fit per layer and ${o.casesPerPallet} per 60 in pallet, so 500 cases need ${o.palletsNeeded} pallets.`,
    how: "Enter outside case dimensions, the case count and pallet limits.",
    assume: "Case cube = L × W × H ÷ 1,728. Layer count uses the best of two orientations (column stacking); a pallet deck is 5.5 in high.",
    faq: [["What is case cube?", "The volume of one shipping case in cubic feet, used for freight class, storage and truck planning."]],
  }),
  mk({
    slug: "price-per-cwt-calculator", title: "Price per CWT (Hundredweight) Calculator",
    desc: "Calculate freight or commodity charges per hundredweight (CWT) — charge at actual weight, the next weight break, the minimum — and the effective rate per pound.",
    meta: "Price per CWT Calculator — Hundredweight Freight Rates",
    inputs: [num("weight", "Shipment Weight (lb)", 850, 1000000, 1), cur("ratePerCwt", "Rate per CWT", 32.5, 1000, 0.01), num("nextBreak", "Next Weight Break (lb, 0 = none)", 1000, 1000000, 1), cur("nextBreakRate", "Rate per CWT at Next Break", 26, 1000, 0.01), cur("minimum", "Minimum Charge", 150, 10000, 1)],
    results: [["freightCharge", "Freight Charge", "c"], ["hundredweights", "Hundredweights (CWT)", "n"], ["chargeAtActualWeight", "Charge at Actual Weight", "c"], ["chargeAtNextBreak", "Charge at Next Break (deficit weight)", "c"], ["usesWeightBreak", "Cheaper to Bill at Break (1 = yes)", "n"], ["effectiveRatePerLb", "Effective Rate per lb", "c"]],
    fn: E.cwt, ex: { weight: 850, ratePerCwt: 32.5, nextBreak: 1000, nextBreakRate: 26, minimum: 150 },
    exText: (o) => `Example: 850 lb at $32.50/CWT is ${usd(o.chargeAtActualWeight)}, but billing as 1,000 lb at $26 costs only ${usd(o.chargeAtNextBreak)} — so the charge is ${usd(o.freightCharge)}.`,
    how: "Enter the weight, the rate per hundred pounds and, if your tariff has one, the next weight break and its rate.",
    assume: "1 CWT = 100 lb (US short hundredweight). LTL tariffs let you rate a shipment at the next break if that's cheaper ('deficit weight').",
    faq: [["What does CWT mean in shipping?", "Hundredweight — 100 pounds. Rates per CWT are multiplied by weight ÷ 100."]],
  }),
  mk({
    slug: "junk-removal-cost-calculator", title: "Junk Removal Cost Calculator",
    desc: "Estimate junk removal cost by truckload volume — from a single item to two trucks — with surcharges for appliances, mattresses, TVs and tires, stairs and local prices.",
    inputs: [dropdown("load", "Volume of Junk", opts(E.JUNK_LOADS.map(([n, p]) => `${n} (~$${p})`)), 3), num("appliances", "Appliances (+$50 each)", 1, 50), num("mattresses", "Mattresses (+$40 each)", 0, 50), num("tvs", "TVs / Monitors (+$35 each)", 0, 50), num("tires", "Tires (+$15 each)", 0, 100), yn("stairs", "Stairs / Long Carry (+$50)?"), region],
    results: [["totalCost", "Estimated Total Cost", "c"], ["loadPrice", "Volume Price", "c"], ["itemSurcharges", "Item Surcharges", "c"], ["accessFee", "Access Fee", "c"], ["cubicYards", "Volume (cubic yards)", "n"], ["lowEstimate", "Low Estimate", "c"], ["highEstimate", "High Estimate", "c"]],
    fn: E.junkRemoval, ex: { load: 3, appliances: 1, mattresses: 0, tvs: 0, tires: 0, stairs: 0, regionAdjust: 0 },
    exText: (o) => `Example: half a truck of household junk plus one appliance costs about ${usd(o.totalCost)} (${usd(o.lowEstimate)}–${usd(o.highEstimate)}).`,
    how: "Estimate how much of a standard 15-yard junk truck your items fill and add special items that carry disposal fees.",
    assume: "2026 typical US full-service pricing (franchise haulers): minimum ~$125, half truck ~$425, full truck ~$700. Large metros cost more.",
    faq: [["How much does junk removal cost?", "Usually $150–700 depending on volume; a full truckload averages around $600–800."]],
  }),
  mk({
    slug: "mobile-home-moving-cost-calculator", title: "Mobile Home Moving Cost Calculator",
    desc: "Estimate the cost to move a single-, double- or triple-wide manufactured home — transport per section and mile, teardown and setup, permits and escorts, utilities.",
    inputs: [dropdown("size", "Home Size", opts(E.MOBILE_HOME.map(([n]) => n)), 1), num("miles", "Moving Distance (miles)", 60, 3000, 1), dropdown("service", "Service", opts(["Full service (teardown, transport, setup)", "Transport only"]), 0), yn("utilities", "Utility Disconnect & Reconnect (~$1,000)?", 1), cur("extras", "Extras (skirting, AC, steps, decks)", 1500, 100000, 50), region],
    results: [["totalCost", "Estimated Total Cost", "c"], ["transportCost", "Transport", "c"], ["teardownSetup", "Teardown & Setup", "c"], ["permitsEscorts", "Permits & Escorts", "c"], ["costPerMile", "Transport Cost per Mile", "c"], ["lowEstimate", "Low Estimate", "c"], ["highEstimate", "High Estimate", "c"]],
    fn: E.mobileHomeMove, ex: { size: 1, miles: 60, service: 0, utilities: 1, extras: 1500, regionAdjust: 0 },
    exText: (o) => `Example: moving a double-wide 60 miles with full service costs about ${usd(o.totalCost)} (${usd(o.lowEstimate)}–${usd(o.highEstimate)}).`,
    how: "Choose the home size, distance and service level. Each section of a multi-section home is hauled separately.",
    assume: "Transport about $7 per mile per section with a $1,500 minimum per section; teardown and setup about $2,500 per section; permits $250 per section plus escorts on long moves.",
    faq: [["How much does it cost to move a double-wide?", "Typically $8,000–15,000 for a local full-service move, more over long distances."]],
  }),
  mk({
    slug: "dumpster-size-calculator", title: "Dumpster Size Calculator",
    desc: "Find the right roll-off dumpster size for a remodel, roof tear-off, cleanout, deck, flooring, drywall, yard waste or concrete job — debris yards, tons, weight limit and rental cost.",
    meta: "Dumpster Size Calculator — What Size Roll-Off Do I Need",
    inputs: [dropdown("project", "Project", opts(E.DUMPSTER_PROJECTS.map(([n]) => n)), 0), num("area", "Area (sq ft)", 200, 100000), num("cubicYardsOverride", "Or Enter Debris Volume (yd³, 0 = estimate)", 0, 500, 0.5), cur("overweightPerTon", "Overweight Fee per Ton", 85, 500, 1)],
    results: [["recommendedSizeYards", "Recommended Dumpster (yd³)", "n"], ["dumpstersNeeded", "Number of Dumpsters / Hauls", "n"], ["debrisCubicYards", "Debris Volume (yd³)", "n"], ["debrisTons", "Debris Weight (tons)", "n"], ["includedTons", "Weight Included (tons)", "n"], ["rentalCost", "Estimated Rental Cost", "c"], ["overweightFees", "Overweight Fees", "c"]],
    fn: E.dumpster, ex: { project: 0, area: 200, cubicYardsOverride: 0, overweightPerTon: 85 },
    exText: (o) => `Example: gutting a 200 sq ft kitchen produces about ${o.debrisCubicYards} yd³ of debris, so a ${o.recommendedSizeYards}-yard dumpster (about ${usd(o.rentalCost)}) is enough.`,
    how: "Pick the project type and enter its area, or type the debris volume directly. Heavy material like concrete or roofing hits weight limits before it fills the box.",
    assume: "Typical 2026 rentals (7–10 days): 10 yd $375 (2 t), 15 yd $425 (2.5 t), 20 yd $475 (3 t), 30 yd $550 (4 t), 40 yd $650 (5 t). Debris factors are rules of thumb.",
    faq: [["What size dumpster for a roof?", "About 1 cubic yard per 80 sq ft of single-layer asphalt shingles — a 20-yard box handles most 2,000 sq ft roofs if weight allows."]],
  }),
  mk({
    slug: "international-moving-cost-calculator", title: "International Moving Cost Calculator",
    desc: "Estimate an international move from the US — shared container (LCL), 20 ft or 40 ft container by home size and destination — with packing, insurance, car shipping and destination fees.",
    meta: "International Moving Cost Calculator — Container Moves Abroad",
    inputs: [dropdown("homeSize", "Home Size", SIZES, 2), dropdown("route", "Destination", opts(E.INTL_ROUTES.map(([n]) => n)), 1), yn("packing", "Professional Packing (~$2.50 per cu ft)?", 1), cur("goodsValue", "Value of Goods", 50000, 10000000, 100), pct("insuranceRate", "Transit Insurance Rate", 2.5, 10, 0.1), yn("shipCar", "Ship a Car (+~$2,500)?"), cur("destinationFees", "Destination Fees (port, customs, delivery)", 1200, 50000, 25)],
    results: [["totalCost", "Estimated Total Cost", "c"], ["oceanFreight", "Container / Freight", "c"], ["containerType", "Container (0 = shared, 1 = 20 ft, 2 = 40 ft)", "n"], ["estimatedCubicFeet", "Estimated Volume (cu ft)", "n"], ["packingCost", "Packing", "c"], ["insuranceCost", "Insurance", "c"], ["lowEstimate", "Low Estimate", "c"], ["highEstimate", "High Estimate", "c"]],
    fn: E.internationalMove, ex: { homeSize: 2, route: 1, packing: 1, goodsValue: 50000, insuranceRate: 2.5, shipCar: 0, destinationFees: 1200 },
    exText: (o) => `Example: a 2-bedroom home (~${o.estimatedCubicFeet} cu ft) from the US to the UK fills a 20 ft container; with packing and insurance the move costs about ${usd(o.totalCost)}.`,
    how: "Choose your home size and destination region, and add packing, insurance and a car if needed.",
    assume: "Door-to-door 2026 averages for household goods; shared container moves are priced per cubic foot at a premium. Import duties on used household goods are often waived for residents — check destination rules.",
    faq: [["How much does it cost to move overseas?", "Typically $5,000–15,000 for a 2–3 bedroom home by sea, more to Australia or by air."]],
  }),
  mk({
    slug: "canada-moving-cost-calculator", title: "Canada Moving Cost Calculator",
    desc: "Estimate moving costs in Canada in CAD — local hourly moves or long-distance moves by home size and kilometres — with packing, valuation coverage, storage and GST/HST.",
    meta: "Moving Costs Canada Calculator — Local & Long Distance (CAD)",
    inputs: [dropdown("homeSize", "Home Size", SIZES, 3), num("distanceKm", "Distance (km)", 540, 7000, 1), cur("hourlyRate", "Local Crew Rate per Hour (CAD, 3 movers)", 160, 500, 5), cur("truckFee", "Local Truck / Travel Fee (CAD)", 150, 1000, 5), pct("seasonAdjust", "Season Adjustment (summer +15%)", 0, 50, 1), yn("packing", "Packing Service (+25%)?"), cur("goodsValue", "Value of Goods (CAD)", 60000, 10000000, 100), pct("valuationRate", "Full-Value Protection Rate", 1, 5, 0.1), cur("storage", "Storage (CAD)", 0, 50000, 10), pct("salesTax", "GST / HST", 13, 15, 0.5)],
    results: [["totalCostCad", "Estimated Total (CAD)", "c"], ["movingCharge", "Moving Charge", "c"], ["packingCost", "Packing", "c"], ["valuationCoverage", "Valuation Coverage", "c"], ["salesTaxAmount", "GST / HST", "c"], ["estimatedWeightLb", "Estimated Weight (lb)", "n"], ["localHours", "Local Move Hours", "n"]],
    currency: "CAD",
    fn: E.canadaMove, ex: { homeSize: 3, distanceKm: 540, hourlyRate: 160, truckFee: 150, seasonAdjust: 0, packing: 0, goodsValue: 60000, valuationRate: 1, storage: 0, salesTax: 13 },
    exText: (o) => `Example: a 3-bedroom move from Toronto to Montreal (~540 km) costs about C${usd(o.totalCostCad)} including 13% HST.`,
    how: "Choose your home size and distance. Moves under 100 km are priced hourly; longer moves by weight and distance.",
    assume: "Long distance: about C$55 + C$0.06 per km per 100 lb of goods (3-bedroom ≈ 8,000 lb). Peak summer moves often cost 10–20% more. HST 13% (Ontario); use 5% GST in Alberta.",
    faq: [["How much does it cost to move across Canada?", "A 3-bedroom home from Toronto to Vancouver typically costs C$15,000–25,000 with a full-service mover."]],
  }),
  mk({
    slug: "lcl-shipping-calculator", title: "LCL Shipping Calculator",
    desc: "Calculate less-than-container-load (LCL) ocean freight — revenue tons (W/M), ocean freight, origin and destination CFS charges, docs, customs — and compare with a 20 ft FCL.",
    meta: "LCL Calculator — Ocean Freight per W/M vs FCL",
    inputs: [num("cbm", "Volume (m³)", 8, 60, 0.1), num("weightKg", "Gross Weight (kg)", 2200, 30000, 1), num("minimumWm", "Minimum Chargeable W/M", 1, 5, 0.5, 0), cur("ratePerWm", "Ocean Rate per W/M", 85, 1000, 1), cur("originCfs", "Origin CFS per W/M", 25, 500, 1), cur("destinationCfs", "Destination CFS per W/M", 45, 500, 1), cur("documentation", "Documentation", 85, 2000, 5), cur("customs", "Customs Clearance", 175, 5000, 5), cur("delivery", "Delivery to Door", 350, 10000, 5), cur("fcl20Price", "20 ft FCL All-In Price (for comparison)", 3200, 50000, 10)],
    results: [["totalCost", "Total LCL Cost", "c"], ["revenueTons", "Chargeable W/M (revenue tons)", "n"], ["oceanFreight", "Ocean Freight", "c"], ["cfsCharges", "CFS Charges", "c"], ["costPerCbm", "Cost per m³", "c"], ["fcl20Comparison", "20 ft FCL Price", "c"], ["fclCheaper", "FCL Would Be Cheaper (1 = yes)", "n"]],
    fn: E.lcl, ex: { cbm: 8, weightKg: 2200, minimumWm: 1, ratePerWm: 85, originCfs: 25, destinationCfs: 45, documentation: 85, customs: 175, delivery: 350, fcl20Price: 3200 },
    exText: (o) => `Example: 8 m³ / 2,200 kg ships as ${o.revenueTons} W/M — ${usd(o.totalCost)} all-in by LCL versus about $3,200 for a 20 ft container.`,
    how: "Enter your cargo volume and weight and the rates from your forwarder. If LCL costs more than a 20 ft container, consider FCL.",
    assume: "Revenue ton = greater of cubic meters and metric tonnes. LCL often stops making sense above about 13–15 m³ compared with a 20 ft container.",
    faq: [["When is FCL cheaper than LCL?", "Usually once you have more than about 13–15 m³ of cargo."]],
  }),
  mk({
    slug: "demurrage-calculator", title: "Demurrage & Detention Calculator",
    desc: "Calculate container demurrage, detention and port storage charges with tiered daily rates after free time — per container and for the whole shipment.",
    meta: "Demurrage Calculator — Container D&D Charges",
    inputs: [num("containers", "Containers", 2, 500, 1, 1), num("daysAtTerminal", "Days at Terminal After Discharge", 9, 120), num("demurrageFreeDays", "Demurrage Free Days", 4, 30), cur("dem1", "Demurrage Days 1–4 After Free (per day)", 150, 2000, 5), cur("dem2", "Demurrage Days 5–8 (per day)", 250, 2000, 5), cur("dem3", "Demurrage Day 9+ (per day)", 350, 2000, 5), num("daysOutOfPort", "Days Out of Port Before Empty Return", 7, 120), num("detentionFreeDays", "Detention Free Days", 4, 30), cur("det1", "Detention Days 1–4 (per day)", 100, 2000, 5), cur("det2", "Detention Days 5–8 (per day)", 150, 2000, 5), cur("det3", "Detention Day 9+ (per day)", 200, 2000, 5), num("storageFreeDays", "Terminal Storage Free Days", 4, 30), cur("storageRate", "Terminal Storage per Day", 0, 1000, 5)],
    results: [["totalCharges", "Total D&D Charges", "c"], ["demurrage", "Demurrage", "c"], ["detention", "Detention", "c"], ["portStorage", "Port Storage", "c"], ["demurrageDays", "Chargeable Demurrage Days", "n"], ["detentionDays", "Chargeable Detention Days", "n"], ["perContainer", "Per Container", "c"]],
    fn: E.demurrage, ex: { containers: 2, daysAtTerminal: 9, demurrageFreeDays: 4, dem1: 150, dem2: 250, dem3: 350, daysOutOfPort: 7, detentionFreeDays: 4, det1: 100, det2: 150, det3: 200, storageFreeDays: 4, storageRate: 0 },
    exText: (o) => `Example: two containers picked up 9 days after discharge (4 free) owe ${o.demurrageDays} days of demurrage, plus ${o.detentionDays} days of detention — ${usd(o.totalCharges)} in total.`,
    how: "Enter days at the terminal and days the container was out before the empty return, free days and your carrier's tiered rates.",
    assume: "Tiers: first 4 chargeable days, next 4, then the top rate. Rates vary by line, port and equipment; reefer and special equipment cost more.",
    faq: [["What's the difference between demurrage and detention?", "Demurrage is charged while the loaded container stays in the port; detention while it's outside the port and not yet returned."]],
  }),
  mk({
    slug: "teu-calculator", title: "TEU Calculator",
    desc: "Convert a mix of 20 ft, 40 ft, 40 ft high-cube and 45 ft containers into TEU and FEU, total internal volume, and how many TEUs or 40-footers your cargo needs.",
    inputs: [num("c20", "20 ft Containers", 10, 100000), num("c40", "40 ft Containers", 5, 100000), num("c40hc", "40 ft High-Cube Containers", 5, 100000), num("c45", "45 ft Containers", 0, 100000), num("cargoCbm", "Cargo Volume to Ship (m³)", 500, 10000000, 1)],
    results: [["totalTeu", "Total TEU", "n"], ["totalFeu", "Total FEU", "n"], ["containerCount", "Containers", "n"], ["internalVolumeCbm", "Internal Volume (m³)", "n"], ["teuNeededForCargo", "TEU Needed for Cargo", "n"], ["fortyFootersForCargo", "40 ft Containers for Cargo", "n"]],
    fn: E.teu, ex: { c20: 10, c40: 5, c40hc: 5, c45: 0, cargoCbm: 500 },
    exText: (o) => `Example: 10 × 20 ft + 5 × 40 ft + 5 × 40 HC = ${o.totalTeu} TEU (${o.totalFeu} FEU). 500 m³ of cargo needs about ${o.teuNeededForCargo} TEU or ${o.fortyFootersForCargo} 40-footers.`,
    how: "Enter container counts by size, and optionally your cargo volume to see how many you'd need.",
    assume: "1 TEU = 20 ft; 40 ft and 40 HC = 2 TEU; 45 ft = 2.25 TEU. Practical loading ≈ 28 m³ per 20 ft and 58 m³ per 40 ft.",
    faq: [["What is a TEU?", "A twenty-foot equivalent unit — the standard measure of container capacity."]],
  }),
  mk({
    slug: "lead-time-calculator", title: "Lead Time Calculator",
    desc: "Add up supply chain lead time — order processing, production, transit, customs and receiving — and get the order-by date, safety stock and reorder point.",
    inputs: [num("orderProcessing", "Order Processing (days)", 3, 365), num("production", "Production / Manufacturing (days)", 25, 365), num("transit", "Transit (days)", 30, 365), num("customs", "Customs Clearance (days)", 4, 365), num("receiving", "Receiving & QC (days)", 2, 365), dateField("needDate", "Date You Need the Stock", "today+120"), num("bufferDays", "Buffer Days", 7, 365), num("dailyDemand", "Average Daily Demand (units)", 40, 1000000), num("demandStdDev", "Daily Demand Std. Dev. (units)", 10, 1000000), num("leadTimeStdDev", "Lead Time Std. Dev. (days)", 5, 365), dropdown("serviceLevel", "Service Level", opts(["90%", "95%", "97.5%", "99%"]), 1)],
    results: [["totalLeadTimeDays", "Total Lead Time (days)", "n"], ["orderByDate", "Place Order By", "d"], ["leadTimeWeeks", "Lead Time (weeks)", "n"], ["safetyStockUnits", "Safety Stock (units)", "n"], ["reorderPointUnits", "Reorder Point (units)", "n"]],
    fn: E.leadTime, ex: { orderProcessing: 3, production: 25, transit: 30, customs: 4, receiving: 2, needDate: 20879, bufferDays: 7, dailyDemand: 40, demandStdDev: 10, leadTimeStdDev: 5, serviceLevel: 1 },
    exText: (o) => `Example: 3 + 25 + 30 + 4 + 2 = ${o.totalLeadTimeDays} days of lead time. Selling 40 a day with variable lead time, hold ${o.safetyStockUnits} units of safety stock and reorder at ${fmt(o.reorderPointUnits, 0)} units.`,
    how: "Enter each stage of lead time, the date you need stock in hand, and demand data for safety stock.",
    assume: "Safety stock = z × √(LT × σd² + d² × σLT²); reorder point = daily demand × LT + safety stock. z: 90% 1.28, 95% 1.65, 97.5% 1.96, 99% 2.33.",
    faq: [["What is lead time in supply chain?", "The total time from placing an order to having the goods ready to sell."]],
  }),
  mk({
    slug: "pallet-calculator", title: "Pallet Calculator (Boxes per Pallet)",
    desc: "Calculate how many boxes fit on a pallet — per layer, layers and total — limited by height and weight, with pallets needed, pallet weight and footprint use.",
    meta: "Pallet Calculator — How Many Boxes per Pallet",
    inputs: [num("boxLength", "Box Length (in)", 16, 100, 0.125), num("boxWidth", "Box Width (in)", 12, 100, 0.125), num("boxHeight", "Box Height (in)", 10, 100, 0.125), num("boxWeight", "Box Weight (lb)", 25, 2000, 0.5), num("totalBoxes", "Total Boxes to Ship", 400, 10000000), num("palletLength", "Pallet Length (in)", 48, 60, 1, 24), num("palletWidth", "Pallet Width (in)", 40, 60, 1, 24), num("palletHeight", "Pallet Height (in)", 5.5, 8, 0.25, 3), num("maxHeight", "Max Load Height incl. Pallet (in)", 60, 108, 1, 20), num("maxWeight", "Max Gross Pallet Weight (lb)", 2500, 5000, 50, 500)],
    results: [["boxesPerPallet", "Boxes per Pallet", "n"], ["boxesPerLayer", "Boxes per Layer", "n"], ["layers", "Layers", "n"], ["palletsNeeded", "Pallets Needed", "n"], ["palletWeightLb", "Loaded Pallet Weight (lb)", "n"], ["footprintUsePercent", "Pallet Footprint Used", "p"], ["limitedByWeight", "Limited by Weight (1 = yes)", "n"]],
    fn: E.pallet, ex: { boxLength: 16, boxWidth: 12, boxHeight: 10, boxWeight: 25, totalBoxes: 400, palletLength: 48, palletWidth: 40, palletHeight: 5.5, maxHeight: 60, maxWeight: 2500 },
    exText: (o) => `Example: 16 × 12 × 10 in boxes fit ${o.boxesPerLayer} per layer and ${o.layers} layers high — ${o.boxesPerPallet} per pallet (${fmt(o.palletWeightLb, 0)} lb), so 400 boxes need ${o.palletsNeeded} pallets.`,
    how: "Enter box size and weight, the pallet size and your height and weight limits.",
    assume: "Column stacking with the better of two box orientations; mixed (interlocked) patterns can sometimes fit one or two more. A wooden GMA pallet weighs about 45 lb.",
    faq: [["How many boxes fit on a pallet?", "It depends on box size; a 48 × 40 pallet loaded to 60 in holds about 50 boxes of 16 × 12 × 10 in."]],
  }),
  mk({
    slug: "pallet-rack-capacity-calculator", title: "Pallet Rack Capacity Calculator",
    desc: "Check pallet rack loads — load per beam level, total bay load, beam and upright frame utilization — and the maximum pallet weight your rack can hold.",
    meta: "Pallet Rack Weight Capacity Calculator",
    inputs: [num("palletWeight", "Pallet Weight (lb)", 2000, 5000, 10), num("palletsPerLevel", "Pallets per Beam Level", 2, 4, 1, 1), num("levels", "Loaded Beam Levels", 3, 10, 1, 1), num("beamCapacity", "Beam Pair Capacity (lb, from label)", 5000, 20000, 50), num("frameCapacity", "Upright Frame Capacity (lb, at your beam spacing)", 20000, 100000, 100)],
    results: [["withinCapacity", "Within Rated Capacity (1 = yes)", "n"], ["loadPerLevelLb", "Load per Level (lb)", "n"], ["totalBayLoadLb", "Total Bay Load (lb)", "n"], ["beamUtilizationPercent", "Beam Utilization", "p"], ["frameUtilizationPercent", "Frame Utilization", "p"], ["maxPalletWeightLb", "Max Pallet Weight Allowed (lb)", "n"]],
    fn: E.rackCapacity, ex: { palletWeight: 2000, palletsPerLevel: 2, levels: 3, beamCapacity: 5000, frameCapacity: 20000 },
    exText: (o) => `Example: two 2,000 lb pallets per level load each beam pair to ${o.beamUtilizationPercent}% of a 5,000 lb rating; three levels put ${fmt(o.totalBayLoadLb, 0)} lb on the bay (${o.frameUtilizationPercent}% of the frame).`,
    how: "Use the beam and upright capacities from the rack manufacturer's load plaque — upright capacity depends on the vertical distance between beams.",
    assume: "Beam capacity is per pair (uniformly distributed); frame capacity is compared with one full bay's load. Never exceed the posted load plaque — have damaged rack inspected.",
    faq: [["How much weight can pallet rack hold?", "It depends on beam size and upright frame; typical beam pairs hold 4,000–6,000 lb and frames 20,000–30,000 lb."]],
  }),
  mk({
    slug: "3pl-fulfillment-cost-calculator", title: "3PL Fulfillment Cost Calculator",
    desc: "Estimate monthly third-party logistics (3PL) costs — receiving, pallet and bin storage, pick and pack, extra items, packaging, shipping labels and minimums — and cost per order.",
    meta: "3PL Calculator — Fulfillment Cost per Order",
    inputs: [num("ordersPerMonth", "Orders per Month", 1000, 10000000), num("itemsPerOrder", "Items per Order", 1.5, 50, 0.1, 1), cur("pickPackPerOrder", "Pick & Pack per Order (1st item)", 3, 50, 0.05), cur("additionalItem", "Each Additional Item", 0.6, 20, 0.05), cur("packagingPerOrder", "Packaging per Order", 0.75, 20, 0.05), cur("avgShippingLabel", "Average Shipping Label", 8.5, 200, 0.05), num("palletsReceived", "Pallets Received per Month", 10, 100000), cur("receivingPerPallet", "Receiving per Pallet", 35, 500, 1), num("palletsStored", "Pallets Stored", 40, 1000000), cur("storagePerPallet", "Storage per Pallet per Month", 25, 200, 0.5), num("binsStored", "Shelf Bins Stored", 0, 1000000), cur("storagePerBin", "Storage per Bin per Month", 5, 100, 0.25), cur("accountFee", "Account / Software Fee", 100, 10000, 5), cur("monthlyMinimum", "Monthly Minimum", 1000, 100000, 50)],
    results: [["monthlyTotal", "Monthly Total incl. Shipping", "c"], ["costPerOrder", "All-In Cost per Order", "c"], ["fulfillmentPerOrderExShipping", "Fulfillment per Order (excl. shipping)", "c"], ["fulfillmentFees", "3PL Fees (after minimum)", "c"], ["receiving", "Receiving", "c"], ["storage", "Storage", "c"], ["pickAndPack", "Pick & Pack", "c"], ["shippingLabels", "Shipping Labels", "c"]],
    fn: E.threePl, ex: { ordersPerMonth: 1000, itemsPerOrder: 1.5, pickPackPerOrder: 3, additionalItem: 0.6, packagingPerOrder: 0.75, avgShippingLabel: 8.5, palletsReceived: 10, receivingPerPallet: 35, palletsStored: 40, storagePerPallet: 25, binsStored: 0, storagePerBin: 5, accountFee: 100, monthlyMinimum: 1000 },
    exText: (o) => `Example: 1,000 orders a month with 40 pallets in storage cost about ${usd(o.monthlyTotal)} — ${usd(o.costPerOrder)} per order including the label, or ${usd(o.fulfillmentPerOrderExShipping)} for fulfillment alone.`,
    how: "Enter volumes and the rate card from your 3PL quote.",
    assume: "2026 typical 3PL rates: pick & pack $2.50–4 per order, $0.50–0.75 per extra item, storage $20–40 per pallet per month, receiving $30–50 per pallet.",
    faq: [["How much does a 3PL cost per order?", "Usually $3–6 per order for fulfillment, plus shipping and storage."]],
  }),
  mk({
    slug: "warehouse-storage-cost-calculator", title: "Warehouse Storage Cost Calculator",
    desc: "Calculate warehouse storage cost per pallet per month — for public / 3PL storage with handling in and out, or for running your own warehouse (rent, staff, utilities, equipment).",
    meta: "Warehouse Storage & Operating Cost Calculator",
    inputs: [dropdown("mode", "Storage Type", opts(["Public / 3PL storage", "Own (leased) warehouse"]), 0), num("pallets", "Pallets Stored (public)", 200, 1000000), cur("storagePerPallet", "Storage per Pallet per Month", 22, 200, 0.5), num("palletsMoved", "Pallets In + Out per Month", 150, 1000000), cur("handlingIn", "Handling In per Pallet", 12, 200, 0.5), cur("handlingOut", "Handling Out per Pallet", 12, 200, 0.5), num("sqFt", "Warehouse Size (sq ft, own)", 20000, 10000000, 100), cur("rentPerSqFtYear", "Rent per Sq Ft per Year (NNN incl.)", 9.5, 100, 0.05), num("palletPositions", "Pallet Positions (own)", 2000, 10000000), num("staff", "Warehouse Staff", 4, 10000), cur("monthlyWage", "Monthly Wage per Person", 3800, 50000, 10), cur("utilities", "Utilities per Month", 2500, 1000000, 10), cur("equipment", "Equipment Leases per Month", 1800, 1000000, 10), cur("otherOverhead", "Other Overhead per Month", 1500, 1000000, 10)],
    results: [["monthlyCost", "Monthly Cost", "c"], ["annualCost", "Annual Cost", "c"], ["costPerPalletMonth", "Cost per Pallet per Month", "c"], ["costPerSqFtYear", "Cost per Sq Ft per Year", "c"]],
    fn: E.warehouseStorage, ex: { mode: 0, pallets: 200, storagePerPallet: 22, palletsMoved: 150, handlingIn: 12, handlingOut: 12, sqFt: 20000, rentPerSqFtYear: 9.5, palletPositions: 2000, staff: 4, monthlyWage: 3800, utilities: 2500, equipment: 1800, otherOverhead: 1500 },
    exText: (o) => `Example: 200 pallets in public storage at $22 a month with 150 pallets moving in and out costs ${usd(o.monthlyCost)} a month — ${usd(o.costPerPalletMonth)} per pallet.`,
    how: "Choose public/3PL storage to price per pallet, or your own warehouse to build up cost from rent, labor and overhead.",
    assume: "Own-warehouse labor includes a 30% burden for taxes and benefits. 2026 US industrial rents average about $8–11 per sq ft per year.",
    faq: [["How much does warehouse storage cost per pallet?", "Public storage typically costs $15–40 per pallet per month plus handling."]],
  }),
  mk({
    slug: "forklift-load-capacity-calculator", title: "Forklift Load Capacity Calculator",
    desc: "Find a forklift's actual capacity at a longer load center, with attachments and lift-height derating — and check whether your load is safe to lift.",
    meta: "Forklift Capacity Calculator — Load Center & Derating",
    inputs: [num("ratedCapacity", "Rated Capacity (lb, data plate)", 5000, 100000, 50), num("ratedLoadCenter", "Rated Load Center (in)", 24, 48, 1, 12), num("actualLoadCenter", "Actual Load Center (in)", 30, 96, 0.5, 6), num("axleToFork", "Front Axle to Fork Face (in)", 18, 40, 0.5, 6), num("attachmentWeight", "Attachment Weight (lb, 0 = none)", 0, 10000, 10), num("attachmentCg", "Attachment Center of Gravity (in from fork face)", 6, 48, 0.5), pct("heightDerate", "Lift-Height Derate (from data plate)", 0, 50, 1), num("loadWeight", "Load Weight (lb)", 3500, 100000, 10)],
    results: [["adjustedCapacityLb", "Adjusted Capacity (lb)", "n"], ["safeToLift", "Safe to Lift (1 = yes)", "n"], ["loadUtilizationPercent", "Load as % of Capacity", "p"], ["capacityLossLb", "Capacity Lost (lb)", "n"], ["adjustedCapacityKg", "Adjusted Capacity (kg)", "n"]],
    fn: E.forklift, ex: { ratedCapacity: 5000, ratedLoadCenter: 24, actualLoadCenter: 30, axleToFork: 18, attachmentWeight: 0, attachmentCg: 6, heightDerate: 0, loadWeight: 3500 },
    exText: (o) => `Example: a 5,000 lb forklift rated at a 24 in load center carries only about ${fmt(o.adjustedCapacityLb, 0)} lb when the load's center is 30 in out — so a 3,500 lb load is ${o.safeToLift ? "OK" : "too heavy"}.`,
    how: "Enter the data-plate capacity and load center, then your load's actual center (half its depth for a uniform load) and any attachment.",
    assume: "Moment balance about the front axle; real capacity also depends on mast tilt and height — always follow the truck's data plate (OSHA 1910.178).",
    faq: [["What is a forklift load center?", "The horizontal distance from the fork face to the load's center of gravity — usually 24 in for a 48 in pallet."]],
  }),
  mk({
    slug: "warehouse-construction-cost-calculator", title: "Warehouse Construction Cost Calculator",
    desc: "Estimate the cost to build a warehouse — dry storage, distribution, flex, cold storage, freezer or automated — with clear height, site work, soft costs and land.",
    inputs: [dropdown("type", "Warehouse Type", opts(E.WH_TYPES.map(([n, c]) => `${n} (~$${c}/sq ft)`)), 1), num("sqFt", "Building Size (sq ft)", 100000, 10000000, 1000), num("clearHeight", "Clear Height (ft)", 36, 60, 1, 16), region, pct("siteWork", "Site Work (% of building)", 15, 60, 0.5), pct("softCosts", "Soft Costs (design, permits, fees)", 12, 40, 0.5), cur("landCost", "Land Cost", 2500000, 1000000000, 1000)],
    results: [["totalProjectCost", "Total Project Cost", "c"], ["costPerSqFt", "All-In Cost per Sq Ft", "c"], ["buildingCost", "Building (hard cost)", "c"], ["buildingCostPerSqFt", "Building Cost per Sq Ft", "c"], ["siteWork", "Site Work", "c"], ["softCosts", "Soft Costs", "c"], ["landCost", "Land", "c"]],
    fn: E.warehouseConstruction, ex: { type: 1, sqFt: 100000, clearHeight: 36, regionAdjust: 0, siteWork: 15, softCosts: 12, landCost: 2500000 },
    exText: (o) => `Example: a 100,000 sq ft distribution center with 36 ft clear costs about ${usd(o.buildingCost)} to build — ${usd(o.totalProjectCost)} all-in with site work, soft costs and land.`,
    how: "Choose the warehouse type, size and clear height, and adjust for your market.",
    assume: "2026 US building hard costs per sq ft (32 ft clear): dry storage ~$95, distribution ~$130, cold storage ~$210, freezer ~$260; +1% per foot of extra clear height.",
    faq: [["How much does it cost to build a warehouse?", "Roughly $90–150 per sq ft for standard space and $200+ for cold storage, before land."]],
  }),
  mk({
    slug: "conveyor-capacity-calculator", title: "Conveyor Capacity Calculator",
    desc: "Calculate conveyor capacity — tons per hour for a bulk belt conveyor by belt width, trough angle, speed and material density, or units per hour for package conveyors.",
    inputs: [dropdown("mode", "Conveyor Type", opts(["Bulk belt conveyor", "Unit / package conveyor"]), 0), num("beltWidth", "Belt Width (in)", 24, 96, 1, 12), dropdown("trough", "Trough Angle", opts(["Flat belt", "20° trough", "35° trough", "45° trough"]), 2), num("speedFpm", "Belt Speed (ft/min)", 350, 1200, 5, 10), num("density", "Material Bulk Density (lb/ft³)", 100, 300, 1, 5), pct("fillPercent", "Loading (% of full cross-section)", 100, 100, 1), num("itemLength", "Item Length in Travel Direction (in)", 18, 120, 0.5), num("gap", "Gap Between Items (in)", 6, 120, 0.5), num("itemWeight", "Item Weight (lb)", 25, 2000, 0.5)],
    results: [["capacityTph", "Capacity (tons per hour)", "n"], ["poundsPerHour", "Pounds per Hour", "n"], ["loadCrossSectionSqFt", "Load Cross-Section (sq ft)", "n"], ["unitsPerHour", "Units per Hour", "n"], ["unitsPerMinute", "Units per Minute", "n"]],
    fn: E.conveyor, ex: { mode: 0, beltWidth: 24, trough: 2, speedFpm: 350, density: 100, fillPercent: 100, itemLength: 18, gap: 6, itemWeight: 25 },
    exText: (o) => `Example: a 24 in, 35° troughed belt running 350 ft/min with 100 lb/ft³ material carries about ${fmt(o.capacityTph, 0)} tons per hour.`,
    how: "For bulk material enter belt width, trough angle, speed and density; for packages switch the type and enter item length, gap and speed.",
    assume: "Cross-section ≈ k × (0.9B − 2)² in² with k = 0.041 flat, 0.09 (20°), 0.12 (35°), 0.135 (45°) at a 20° surcharge angle — close to CEMA tables. Inclines above ~10° reduce capacity.",
    faq: [["How do you calculate belt conveyor capacity?", "Capacity = cross-sectional load area × belt speed × material density."]],
  }),
  mk({
    slug: "bulk-bag-calculator", title: "Bulk Bag (FIBC) Size & Capacity Calculator",
    desc: "Calculate jumbo bag (FIBC) fill volume in cubic feet and m³, capacity in lb and kg for your material density, safe working load check and bags needed for an order.",
    meta: "Jumbo Bag Size Calculator — FIBC Volume & Capacity",
    inputs: [dropdown("unit", "Units", opts(["Inches", "Centimeters"]), 0), dropdown("shape", "Bag Shape", opts(["Square (U-panel / 4-panel)", "Circular"]), 0), num("length", "Length or Diameter", 35, 300, 0.5), num("width", "Width", 35, 300, 0.5), num("height", "Height", 40, 400, 0.5), pct("fillPercent", "Fill Level", 90, 100, 1), num("density", "Material Bulk Density (lb/ft³)", 60, 300, 0.5, 1), num("swl", "Safe Working Load (lb, 0 = skip)", 2200, 10000, 10), num("orderTons", "Order Quantity (short tons)", 20, 100000, 0.5)],
    results: [["capacityLb", "Capacity (lb)", "n"], ["capacityKg", "Capacity (kg)", "n"], ["fillVolumeCuFt", "Fill Volume (cu ft)", "n"], ["fillVolumeM3", "Fill Volume (m³)", "n"], ["withinSwl", "Within Safe Working Load (1 = yes)", "n"], ["bagsForOrder", "Bags for Order", "n"]],
    fn: E.fibc, ex: { unit: 0, shape: 0, length: 35, width: 35, height: 40, fillPercent: 90, density: 60, swl: 2200, orderTons: 20 },
    exText: (o) => `Example: a 35 × 35 × 40 in bag filled to 90% holds ${o.fillVolumeCuFt} cu ft — ${fmt(o.capacityLb, 0)} lb of a 60 lb/ft³ material, so 20 tons needs ${o.bagsForOrder} bags.`,
    how: "Enter the bag dimensions, fill level and your product's bulk density, plus the bag's rated safe working load.",
    assume: "Square bags bulge when filled, so real volume can be 5–10% more than L × W × H. Never exceed the bag's SWL (usually 5:1 safety factor).",
    faq: [["How much does a bulk bag hold?", "A standard 35 × 35 × 40 in FIBC holds about 28 cu ft — 1,000–3,000 lb depending on the material."]],
  }),
  mk({
    slug: "warehouse-led-lighting-calculator", title: "Warehouse LED Lighting Calculator",
    desc: "Size a warehouse LED high-bay retrofit with the lumen method — fixtures for your foot-candle target, kW and kWh saved, annual savings, project cost and payback.",
    inputs: [num("sqFt", "Warehouse Area (sq ft)", 50000, 10000000, 100), dropdown("task", "Activity", opts(["Bulk storage (20 fc)", "Picking / active storage (30 fc)", "Packing / assembly (50 fc)", "Inactive storage (10 fc)"]), 1), num("ledLumens", "LED Fixture Lumens", 24000, 100000, 100, 1000), num("ledWatts", "LED Fixture Watts", 150, 1000, 1, 10), num("cu", "Coefficient of Utilization", 0.75, 1, 0.01, 0.3), num("llf", "Light Loss Factor", 0.85, 1, 0.01, 0.5), num("oldFixtures", "Existing Fixtures", 150, 100000), num("oldWatts", "Existing Watts per Fixture (incl. ballast)", 458, 2000, 1), yn("controls", "Add Occupancy Sensors (−25% LED use)?", 1), num("hoursPerYear", "Operating Hours per Year", 5000, 8760, 10), cur("pricePerKwh", "Electricity Price per kWh", 0.13, 1, 0.005), cur("maintenanceSavings", "Annual Maintenance Savings", 2000, 1000000, 50), cur("fixtureCost", "LED Fixture Cost", 180, 5000, 5), cur("installPerFixture", "Installation per Fixture", 75, 1000, 5), cur("rebate", "Utility Rebate", 6000, 10000000, 50)],
    results: [["ledFixturesNeeded", "LED Fixtures Needed", "n"], ["annualSavings", "Annual Savings", "c"], ["paybackYears", "Simple Payback (years)", "n"], ["projectCost", "Net Project Cost", "c"], ["annualKwhSaved", "kWh Saved per Year", "n"], ["oldConnectedKw", "Old Lighting Load (kW)", "n"], ["newConnectedKw", "New Lighting Load (kW)", "n"], ["targetFootcandles", "Target Foot-Candles", "n"]],
    fn: E.ledLighting, ex: { sqFt: 50000, task: 1, ledLumens: 24000, ledWatts: 150, cu: 0.75, llf: 0.85, oldFixtures: 150, oldWatts: 458, controls: 1, hoursPerYear: 5000, pricePerKwh: 0.13, maintenanceSavings: 2000, fixtureCost: 180, installPerFixture: 75, rebate: 6000 },
    exText: (o) => `Example: 50,000 sq ft of picking area at 30 fc needs ${o.ledFixturesNeeded} LED high bays replacing 150 × 400 W metal halide — saving about ${usd(o.annualSavings)} a year with a ${o.paybackYears}-year payback.`,
    how: "Enter the area and activity, your LED fixture's lumens and watts, the existing fixtures, hours and electricity price.",
    assume: "Lumen method: fixtures = foot-candles × area ÷ (lumens × CU × LLF). IES recommended levels: bulk storage 10–20 fc, picking 30, packing 50. A 400 W metal halide draws about 458 W with its ballast.",
    faq: [["How many LED high bays do I need?", "Roughly one 24,000-lumen fixture per 400–600 sq ft for 20–30 fc in a typical warehouse."]],
  }),
  mk({
    slug: "fill-rate-calculator", title: "Fill Rate Calculator",
    desc: "Calculate order fill rate, line fill rate and unit (case) fill rate, backordered units and the value of sales lost to stockouts.",
    inputs: [num("totalOrders", "Total Orders", 1000, 100000000), num("ordersComplete", "Orders Shipped Complete", 940, 100000000), num("linesOrdered", "Order Lines", 3200, 100000000), num("linesShipped", "Lines Shipped Complete", 3104, 100000000), num("unitsOrdered", "Units Ordered", 15000, 1000000000), num("unitsShipped", "Units Shipped", 14700, 1000000000), cur("unitPrice", "Average Unit Price", 20, 100000, 0.01), pct("lostShare", "Backorders That Become Lost Sales", 30, 100, 1)],
    results: [["orderFillRatePercent", "Order Fill Rate", "p"], ["lineFillRatePercent", "Line Fill Rate", "p"], ["unitFillRatePercent", "Unit Fill Rate", "p"], ["backorderedUnits", "Backordered Units", "n"], ["lostSalesValue", "Estimated Lost Sales", "c"]],
    fn: E.fillRate, ex: { totalOrders: 1000, ordersComplete: 940, linesOrdered: 3200, linesShipped: 3104, unitsOrdered: 15000, unitsShipped: 14700, unitPrice: 20, lostShare: 30 },
    exText: (o) => `Example: 940 of 1,000 orders shipped complete is a ${o.orderFillRatePercent}% order fill rate, while units filled at ${o.unitFillRatePercent}%; 300 backordered units could cost ${usd(o.lostSalesValue)} in lost sales.`,
    how: "Enter orders, lines and units ordered and shipped for the same period.",
    assume: "Order fill rate is the strictest measure (every line complete); unit fill rate is the most forgiving. Best-in-class distribution targets 97–99%.",
    faq: [["What is a good fill rate?", "Most distributors aim for 95–98%; retailers often demand 98%+ from suppliers."]],
  }),
  mk({
    slug: "fleet-management-roi-calculator", title: "Fleet Management ROI Calculator",
    desc: "Estimate the return on fleet management / telematics software — fuel, maintenance, accident, labor and insurance savings against subscription and hardware — with ROI and payback.",
    inputs: [num("vehicles", "Vehicles", 25, 100000), cur("fuelPerVehicle", "Annual Fuel per Vehicle", 9000, 200000, 50), pct("fuelSavings", "Fuel Savings (idling, routing)", 8, 50, 0.5), cur("maintenancePerVehicle", "Annual Maintenance per Vehicle", 2500, 100000, 50), pct("maintenanceSavings", "Maintenance Savings", 10, 50, 0.5), cur("annualAccidentCost", "Annual Accident Costs (fleet)", 40000, 100000000, 100), pct("accidentReduction", "Accident Reduction", 20, 80, 1), num("hoursSavedPerVehicleMonth", "Admin / Dispatch Hours Saved per Vehicle per Month", 2, 50, 0.5), cur("hourlyWage", "Loaded Hourly Wage", 32, 200, 0.5), cur("annualInsurance", "Annual Fleet Insurance", 75000, 100000000, 100), pct("insuranceDiscount", "Telematics Insurance Discount", 5, 30, 0.5), cur("softwarePerVehicleMonth", "Software per Vehicle per Month", 30, 200, 0.5), cur("hardwarePerVehicle", "Hardware & Install per Vehicle", 150, 2000, 5)],
    results: [["firstYearNet", "First-Year Net Benefit", "c"], ["annualSavings", "Annual Savings", "c"], ["roiPercent", "First-Year ROI", "p"], ["paybackMonths", "Payback (months)", "n"], ["annualSubscription", "Annual Subscription", "c"], ["hardwareCost", "Hardware (one-time)", "c"], ["fuelSavings", "Fuel Savings", "c"], ["laborSavings", "Labor Savings", "c"]],
    fn: E.fleetRoi, ex: { vehicles: 25, fuelPerVehicle: 9000, fuelSavings: 8, maintenancePerVehicle: 2500, maintenanceSavings: 10, annualAccidentCost: 40000, accidentReduction: 20, hoursSavedPerVehicleMonth: 2, hourlyWage: 32, annualInsurance: 75000, insuranceDiscount: 5, softwarePerVehicleMonth: 30, hardwarePerVehicle: 150 },
    exText: (o) => `Example: 25 vehicles could save about ${usd(o.annualSavings)} a year against ${usd(o.annualSubscription)} of subscriptions and ${usd(o.hardwareCost)} of hardware — a first-year ROI of ${o.roiPercent}% and payback in ${o.paybackMonths} months.`,
    how: "Enter your fleet size and current costs, then realistic savings percentages (vendor case studies typically cite 5–15% fuel and 10–30% accident reductions).",
    assume: "Savings are applied to current annual costs; results depend heavily on driver coaching and actually acting on the data.",
    faq: [["Is fleet tracking worth it?", "For most fleets of 10+ vehicles, fuel, labor and accident savings pay back telematics within a year."]],
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
      categoryId: cat.id,
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
