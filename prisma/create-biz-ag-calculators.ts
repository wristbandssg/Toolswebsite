// One-time (but safe to re-run) batch setup script: creates 30 agriculture & livestock calculators
// (Business & Industrial Calculators > Agriculture & Livestock Calculators). Formulas and data tables live
// in src/lib/calc-engine-biz-ag.ts; examples are computed from the engine. Merged keywords (no separate
// page): Pioneer Yield → corn-yield; Gallons per Acre, Spray Rate → sprayer-calibration; Brandt Auger →
// auger; Cow, Cow Breeding, Bovine Gestation, Cattle Breeding, Calf, Jersey Gestation → cattle-gestation;
// Goat Kidding → goat-gestation; Farm Profit (cattle breakeven) → cattle-breakeven. Farm Equipment
// Financing → existing farm-equipment-loan-calculator.
//
// HOW TO RUN (after prisma/setup-business-industrial-category.ts --apply)
//   npx tsx prisma/create-biz-ag-calculators.ts
// or
//   npm run db:create-biz-ag-calculators

import * as E from "../src/lib/calc-engine-biz-ag";

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

const CAT = "agriculture-livestock-calculators";
const NOTE = "Farm estimates vary with weather, soils, genetics and markets — confirm agronomic rates with soil tests and your extension service, and animal health dates with your veterinarian.";

const dateField = (key: string, label: string, def: number | string = "today") => ({ key, label, type: "date", required: true, default: def });
const CROPS = opts(E.CROP_LB.map(([n, lb]) => `${n} (${lb} lb/bu)`));
const D0 = 20759; // 2 Nov 2026, for examples

const TOOLS: ToolDef[] = [
  mk({
    slug: "corn-yield-calculator", title: "Corn Yield Calculator (Yield Component Method)",
    desc: "Estimate corn yield before harvest — ears in 1/1000 acre, kernel rows and kernels per row, and a kernels-per-bushel factor — with tonnes per hectare and revenue.",
    meta: "Corn Yield Calculator — Estimate Bushels per Acre",
    inputs: [num("rowSpacing", "Row Spacing (in)", 30, 60, 1, 7), num("earsCounted", "Ears Counted in 1/1000 Acre of Row", 32, 100, 1), num("kernelRows", "Kernel Rows per Ear (average)", 16, 24, 1, 8), num("kernelsPerRow", "Kernels per Row (average)", 35, 60, 1, 5), num("kernelFactor", "Kernels per Bushel Factor", 90000, 120000, 1000, 65000), cur("price", "Corn Price per Bushel", 4.25, 20, 0.01), num("acres", "Field Acres", 160, 100000, 1)],
    results: [["yieldBuPerAcre", "Estimated Yield (bu/acre)", "n"], ["earsPerAcre", "Ears per Acre", "n"], ["kernelsPerEar", "Kernels per Ear", "n"], ["rowLengthFor1000thAcreFt", "Row Length for 1/1000 Acre (ft)", "n"], ["yieldTonnesPerHa", "Yield (t/ha)", "n"], ["revenuePerAcre", "Revenue per Acre", "c"], ["totalBushels", "Field Total (bu)", "n"]],
    fn: E.cornYield, ex: { rowSpacing: 30, earsCounted: 32, kernelRows: 16, kernelsPerRow: 35, kernelFactor: 90000, price: 4.25, acres: 160 },
    exText: (o) => `Example: 32 ears in 17.4 ft of 30 in row with 16 rows × 35 kernels gives about ${o.yieldBuPerAcre} bu/acre (${o.yieldTonnesPerHa} t/ha).`,
    how: "Measure the row length shown for your spacing, count harvestable ears, and average kernel rows and kernels per row from several ears. Repeat in 5+ spots. Use 80,000–85,000 in good grain-fill years and 95,000–105,000 under stress.",
    assume: "Yield = ears/acre × kernels/ear ÷ kernels per bushel (the agronomist's yield-component method used by seed companies such as Pioneer). Accuracy ±20%.",
    faq: [["How accurate is the corn yield estimate?", "Usually within 10–20% if you sample enough spots; kernel weight is the big unknown before black layer."]],
  }),
  mk({
    slug: "soybean-yield-calculator", title: "Soybean Yield Calculator",
    desc: "Estimate soybean yield from plant stand, pods per plant, seeds per pod and seed size — bushels per acre, tonnes per hectare and revenue.",
    inputs: [dropdown("mode", "Stand Entered As", opts(["Plants per row foot", "Plants per acre"]), 0), num("plantsPerFoot", "Plants per Row Foot", 4, 30, 0.1), num("rowSpacing", "Row Spacing (in)", 30, 40, 0.5, 7), num("plantsPerAcre", "Plants per Acre", 120000, 400000, 1000), num("podsPerPlant", "Pods per Plant", 35, 150, 1), num("seedsPerPod", "Seeds per Pod", 2.5, 4, 0.1, 1), num("seedsPerLb", "Seeds per Pound (seed size)", 2800, 4000, 50, 1800), cur("price", "Soybean Price per Bushel", 10.5, 30, 0.01)],
    results: [["yieldBuPerAcre", "Estimated Yield (bu/acre)", "n"], ["plantsPerAcre", "Plants per Acre", "n"], ["seedsPerAcre", "Seeds per Acre", "n"], ["yieldTonnesPerHa", "Yield (t/ha)", "n"], ["revenuePerAcre", "Revenue per Acre", "c"]],
    fn: E.soybeanYield, ex: { mode: 0, plantsPerFoot: 4, rowSpacing: 30, plantsPerAcre: 120000, podsPerPlant: 35, seedsPerPod: 2.5, seedsPerLb: 2800, price: 10.5 },
    exText: (o) => `Example: 4 plants per foot in 30 in rows (${fmt(o.plantsPerAcre, 0)}/acre) with 35 pods and 2.5 seeds each yields about ${o.yieldBuPerAcre} bu/acre.`,
    how: "Count plants in a few row feet and pods on 10 representative plants. Use 2,500 seeds/lb for large seed in good years, 3,200+ under late-season stress.",
    assume: "Yield = plants × pods × seeds per pod ÷ seeds per lb ÷ 60 lb/bu. Seed size isn't set until R7, so early estimates can swing ±25%.",
    faq: [["How many soybean seeds are in a pound?", "Usually 2,500–3,500; 2,800 is a common planning value."]],
  }),
  mk({
    slug: "acres-per-hour-calculator", title: "Acres per Hour Calculator (Field Capacity)",
    desc: "Calculate field capacity — acres per hour and per day from implement width, ground speed and field efficiency — with hours and days to finish a field and fuel used.",
    inputs: [num("width", "Implement Working Width (ft)", 40, 200, 0.5), num("speed", "Ground Speed (mph)", 6, 25, 0.1), pct("efficiency", "Field Efficiency", 75, 100, 1), num("hoursPerDay", "Working Hours per Day", 10, 24, 0.5), num("fieldAcres", "Field Size (acres)", 320, 100000, 1), num("fuelPerHour", "Fuel Use (gal/h)", 12, 100, 0.1)],
    results: [["acresPerHour", "Acres per Hour", "n"], ["acresPerDay", "Acres per Day", "n"], ["hoursForField", "Hours to Finish Field", "n"], ["daysForField", "Days to Finish Field", "n"], ["hectaresPerHour", "Hectares per Hour", "n"], ["fuelGallons", "Fuel for Field (gal)", "n"]],
    fn: E.acresPerHour, ex: { width: 40, speed: 6, efficiency: 75, hoursPerDay: 10, fieldAcres: 320, fuelPerHour: 12 },
    exText: (o) => `Example: a 40 ft planter at 6 mph and 75% efficiency covers ${o.acresPerHour} acres an hour — ${o.acresPerDay} a day — finishing 320 acres in ${o.daysForField} days.`,
    how: "Enter the implement's working width, average speed and field efficiency (turns, filling, overlaps).",
    assume: "Acres/hour = width × mph × efficiency ÷ 8.25. ASABE D497 typical efficiencies: planting 50–75%, tillage 70–90%, spraying 50–80%, combining 65–80%.",
    faq: [["How do you calculate acres per hour?", "Multiply width in feet by speed in mph and efficiency, then divide by 8.25."]],
  }),
  mk({
    slug: "grain-bin-calculator", title: "Grain Bin Calculator",
    desc: "Calculate grain bin capacity in bushels — round bin diameter, grain depth and peaked cone — with tons, metric tonnes, value and bushels per foot of depth for corn, soybeans, wheat and more.",
    meta: "Grain Bin Calculator — Bushels in a Round Bin",
    inputs: [num("diameter", "Bin Diameter (ft)", 36, 160, 0.5), num("grainDepth", "Grain Depth to Eave / Level (ft)", 24, 100, 0.5), yn("peaked", "Grain Peaked to the Roof?", 1), num("reposeAngle", "Angle of Repose (°, corn ≈ 23)", 23, 35, 0.5, 10), pct("compaction", "Compaction / Pack Factor", 4, 10, 0.5), dropdown("crop", "Grain", CROPS, 0), cur("price", "Price per Bushel", 4.25, 30, 0.01)],
    results: [["bushels", "Capacity (bushels)", "n"], ["weightTons", "Weight (tons)", "n"], ["metricTonnes", "Weight (metric tonnes)", "n"], ["cubicFeet", "Volume (cu ft)", "n"], ["peakHeightFt", "Peak Height (ft)", "n"], ["bushelsPerFootOfDepth", "Bushels per Foot of Depth", "n"], ["grainValue", "Grain Value", "c"]],
    fn: E.grainBin, ex: { diameter: 36, grainDepth: 24, peaked: 1, reposeAngle: 23, compaction: 4, crop: 0, price: 4.25 },
    exText: (o) => `Example: a 36 ft bin with 24 ft of corn plus a peak holds about ${fmt(o.bushels, 0)} bushels (${fmt(o.weightTons, 0)} tons) — ${fmt(o.bushelsPerFootOfDepth, 0)} bu per foot of depth.`,
    how: "Measure inside diameter and grain depth at the wall; add the peak if the grain is coned up to the roof.",
    assume: "1 bushel = 1.2445 cu ft; cone volume uses the angle of repose. Compaction adds 3–8% in tall bins.",
    faq: [["How many bushels in a 36 ft bin?", "About 800 bushels per foot of grain depth — 24 ft of corn plus the peak is roughly 21,000 bu."]],
  }),
  mk({
    slug: "fertilizer-calculator", title: "Fertilizer Calculator",
    desc: "Calculate how much fertilizer to apply to meet a nitrogen, phosphate or potash target — product rate per acre or per 1,000 sq ft for any N-P-K blend — with nutrients supplied, bags and cost.",
    meta: "Fertilizer Calculator — Product Rate for Any N-P-K",
    inputs: [num("n", "Product N %", 10, 82, 1), num("p", "Product P₂O₅ %", 10, 60, 1), num("k", "Product K₂O %", 10, 60, 1), num("targetN", "Target N (lb/acre)", 40, 400, 1), num("targetP", "Target P₂O₅ (lb/acre)", 40, 400, 1), num("targetK", "Target K₂O (lb/acre)", 40, 400, 1), dropdown("limitBy", "Rate Based On", opts(["Nitrogen", "Phosphate", "Potash"]), 0), dropdown("areaUnit", "Area Unit", opts(["Acres", "1,000 sq ft"]), 0), num("area", "Area", 10, 100000, 0.1), num("bagSize", "Bag / Tote Size (lb)", 50, 2000, 1, 1), cur("bagPrice", "Price per Bag", 28, 2000, 0.25)],
    results: [["productLbPerAcre", "Product Rate (lb/acre)", "n"], ["productLbPer1000SqFt", "Product Rate (lb per 1,000 sq ft)", "n"], ["totalProductLb", "Total Product (lb)", "n"], ["bagsNeeded", "Bags Needed", "n"], ["nSuppliedLbPerAcre", "N Supplied (lb/acre)", "n"], ["p2o5SuppliedLbPerAcre", "P₂O₅ Supplied (lb/acre)", "n"], ["k2oSuppliedLbPerAcre", "K₂O Supplied (lb/acre)", "n"], ["totalCost", "Total Cost", "c"]],
    fn: E.fertilizer, ex: { n: 10, p: 10, k: 10, targetN: 40, targetP: 40, targetK: 40, limitBy: 0, areaUnit: 0, area: 10, bagSize: 50, bagPrice: 28 },
    exText: (o) => `Example: 40 lb N per acre from 10-10-10 takes ${o.productLbPerAcre} lb of product per acre — ${o.bagsNeeded} bags for 10 acres.`,
    how: "Enter the three numbers on the bag, your soil-test targets and which nutrient sets the rate. Gardeners can work per 1,000 sq ft.",
    assume: "Product rate = target ÷ (nutrient % ÷ 100). Labels show P as P₂O₅ and K as K₂O.",
    faq: [["How much 10-10-10 do I need per acre?", "100 lb of 10-10-10 supplies 10 lb each of N, P₂O₅ and K₂O."]],
  }),
  mk({
    slug: "sprayer-calibration-calculator", title: "Sprayer Calibration Calculator (GPA & Nozzle Size)",
    desc: "Calibrate a boom sprayer — gallons per acre from nozzle output, or the GPM per nozzle needed for a target GPA — with ounces per minute, TeeJet-style nozzle size and pressure, and acres per tank.",
    meta: "Sprayer Calibration & Gallons per Acre Calculator (TeeJet-Style)",
    inputs: [dropdown("mode", "Calculate", opts(["Nozzle needed for a target GPA", "GPA from a catch test"]), 0), num("targetGpa", "Target Rate (gal/acre)", 15, 100, 0.5, 1), num("speed", "Ground Speed (mph)", 10, 25, 0.1, 1), num("nozzleSpacing", "Nozzle Spacing (in)", 20, 60, 0.5, 5), num("ounces", "Catch Test: Ounces Collected", 34, 1000, 0.1), num("catchMinutes", "Catch Test Time (min)", 1, 10, 0.25, 0.1), num("tankGallons", "Tank Size (gal)", 1000, 20000, 1), num("productRatePerAcre", "Product Rate per Acre (oz or pt)", 32, 1000, 0.1)],
    results: [["gallonsPerAcre", "Application Rate (GPA)", "n"], ["gpmPerNozzle", "GPM per Nozzle", "n"], ["ouncesPerMinute", "Ounces per Minute per Nozzle", "n"], ["nozzleSizeCode", "Nozzle Size (e.g. 04 = 0.4 gpm at 40 psi)", "n"], ["pressureForThatNozzlePsi", "Pressure Needed with That Nozzle (psi)", "n"], ["acresPerTank", "Acres per Tank", "n"], ["productPerTank", "Product per Tank", "n"]],
    fn: E.sprayer, ex: { mode: 0, targetGpa: 15, speed: 10, nozzleSpacing: 20, ounces: 34, catchMinutes: 1, tankGallons: 1000, productRatePerAcre: 32 },
    exText: (o) => `Example: 15 GPA at 10 mph on 20 in spacing needs ${o.gpmPerNozzle} GPM per nozzle (${o.ouncesPerMinute} oz/min) — a size ${String(o.nozzleSizeCode).padStart(2, "0")} tip at about ${o.pressureForThatNozzlePsi} psi; a 1,000 gal tank covers ${o.acresPerTank} acres.`,
    how: "Choose a target GPA and travel speed to pick nozzles, or catch one nozzle's output for a timed minute to check calibration.",
    assume: "GPA = GPM × 5,940 ÷ (mph × spacing in); flow varies with √pressure. Nozzle codes follow the industry standard (02 = 0.2 gpm at 40 psi). Independent tool — not affiliated with TeeJet.",
    faq: [["How do I calibrate a sprayer?", "Catch a nozzle's output for one minute, convert to GPM and plug it into GPA = GPM × 5,940 ÷ (mph × nozzle spacing)."]],
  }),
  mk({
    slug: "nitrogen-rate-calculator", title: "Nitrogen Rate Calculator",
    desc: "Calculate corn nitrogen rate from yield goal minus credits for previous crop, manure and soil nitrate — then product rate for anhydrous, urea, UAN 28/32 or AMS and cost per acre.",
    meta: "Nitrogen Calculator — Corn N Rate & Product Needed",
    inputs: [num("yieldGoal", "Yield Goal (bu/acre)", 200, 400, 1), num("nPerBushel", "N per Bushel (lb)", 1.0, 1.4, 0.05, 0.5), dropdown("previousCrop", "Previous Crop", opts(["Corn", "Soybeans (−30 lb)", "Alfalfa, good stand (−100 lb)", "Alfalfa, thin / other legume (−50 lb)", "Small grain / other"]), 1), num("manureN", "Manure N Credit (lb/acre)", 0, 300, 1), num("soilNitrateCredit", "Soil Nitrate Test Credit (lb/acre)", 0, 200, 1), dropdown("source", "N Source", opts(E.N_SOURCES.map(([n]) => n)), 0), cur("pricePerLbN", "Price per lb of N", 0.6, 5, 0.01), num("acres", "Acres", 160, 100000, 1)],
    results: [["nRateLbPerAcre", "N Rate (lb N/acre)", "n"], ["productLbPerAcre", "Product (lb/acre)", "n"], ["productGalPerAcre", "Product (gal/acre, UAN)", "n"], ["creditsLbPerAcre", "Credits Applied (lb/acre)", "n"], ["costPerAcre", "N Cost per Acre", "c"], ["totalCost", "Total N Cost", "c"], ["totalProductTons", "Total Product (tons)", "n"]],
    fn: E.nitrogenRate, ex: { yieldGoal: 200, nPerBushel: 1.0, previousCrop: 1, manureN: 0, soilNitrateCredit: 0, source: 0, pricePerLbN: 0.6, acres: 160 },
    exText: (o) => `Example: a 200 bu goal after soybeans needs about ${o.nRateLbPerAcre} lb N/acre — ${o.productLbPerAcre} lb of anhydrous ammonia, about ${usd(o.costPerAcre)} per acre.`,
    how: "Enter your yield goal and credits. Many Corn Belt states now recommend the MRTN approach (Iowa State N-rate calculator) — use its rate if available, which is often 140–180 lb after soybeans.",
    assume: "Yield-goal method: goal × 1.0–1.2 lb N/bu minus credits (soybeans 30, good alfalfa 100). UAN 28% = 3.0 lb N per gallon, 32% = 3.54.",
    faq: [["How much nitrogen does corn need?", "Commonly 140–200 lb N per acre after soybeans and 180–220 after corn, depending on soil and price ratio."]],
  }),
  mk({
    slug: "lime-calculator", title: "Lime Calculator (Ag & Garden)",
    desc: "Estimate agricultural lime needed to raise soil pH — tons per acre or pounds per 1,000 sq ft by soil texture, incorporation depth and lime quality (ECCE) — with total tons, bags and cost.",
    inputs: [num("currentPh", "Current Soil pH", 5.8, 8, 0.1, 3.5), num("targetPh", "Target pH", 6.5, 8, 0.1, 4), dropdown("texture", "Soil Texture", opts(["Sand / loamy sand", "Sandy loam / loam", "Silt loam / clay loam", "Clay / high organic matter"]), 1), num("depth", "Incorporation Depth (in)", 6, 12, 1, 2), pct("ecce", "Lime Quality (ECCE / ENV %)", 90, 120, 1), dropdown("areaUnit", "Area Unit", opts(["Acres", "1,000 sq ft"]), 0), num("area", "Area", 40, 100000, 0.1), cur("pricePerTon", "Lime Price per Ton", 35, 500, 0.5), cur("spreadPerAcre", "Spreading per Acre", 8, 100, 0.25)],
    results: [["tonsPerAcre", "Lime Needed (tons/acre)", "n"], ["lbPer1000SqFt", "Lime per 1,000 sq ft (lb)", "n"], ["totalTons", "Total Lime (tons)", "n"], ["bags40lb", "40 lb Bags (garden)", "n"], ["totalCost", "Total Cost", "c"], ["phChange", "pH Increase", "n"]],
    fn: E.lime, ex: { currentPh: 5.8, targetPh: 6.5, texture: 1, depth: 6, ecce: 90, areaUnit: 0, area: 40, pricePerTon: 35, spreadPerAcre: 8 },
    exText: (o) => `Example: raising a loam from pH 5.8 to 6.5 takes about ${o.tonsPerAcre} tons of 90% ECCE lime per acre (${o.lbPer1000SqFt} lb per 1,000 sq ft) — ${o.totalTons} tons for 40 acres.`,
    how: "Use your soil test pH (a buffer-pH recommendation from the lab is more precise), soil texture and the lime's ECCE from the quarry ticket.",
    assume: "Rule of thumb: tons of 100% ECCE lime per acre per pH unit to 6 in — sand 1, loam 1.5, silt/clay loam 2, clay or high OM 2.5. Apply no more than ~2 tons/acre at once on lawns.",
    faq: [["How much lime per acre to raise pH 1 point?", "Roughly 1–2.5 tons of good ag lime depending on soil texture."]],
  }),
  mk({
    slug: "seeding-rate-calculator", title: "Seeding Rate Calculator (Soybean Population)",
    desc: "Calculate seeding rate for a target final stand — seeds per acre after germination and emergence, pounds and bushels per acre, seeds per row foot, seed units and seed cost.",
    meta: "Seeding Rate Calculator — Soybean Population & Seed Units",
    inputs: [num("targetStand", "Target Final Stand (plants/acre)", 120000, 2000000, 1000), pct("germination", "Germination (seed tag)", 90, 100, 1), pct("emergence", "Expected Field Emergence", 85, 100, 1), num("seedsPerLb", "Seeds per Pound", 2800, 200000, 10, 100), num("rowSpacing", "Row Spacing (in)", 30, 40, 0.5, 5), num("seedsPerUnit", "Seeds per Unit / Bag (140k soy, 80k corn)", 140000, 1000000, 1000, 1000), cur("pricePerUnit", "Price per Unit", 62, 1000, 0.5), num("acres", "Acres", 160, 100000, 1)],
    results: [["seedsPerAcre", "Seeding Rate (seeds/acre)", "n"], ["lbPerAcre", "Pounds per Acre", "n"], ["bushelsPerAcre", "Bushels per Acre (60 lb)", "n"], ["seedsPerRowFoot", "Seeds per Row Foot", "n"], ["seedUnitsNeeded", "Seed Units Needed", "n"], ["seedCost", "Total Seed Cost", "c"], ["seedCostPerAcre", "Seed Cost per Acre", "c"]],
    fn: E.seedingRate, ex: { targetStand: 120000, germination: 90, emergence: 85, seedsPerLb: 2800, rowSpacing: 30, seedsPerUnit: 140000, pricePerUnit: 62, acres: 160 },
    exText: (o) => `Example: for 120,000 soybean plants per acre at 90% germ and 85% emergence, plant ${fmt(o.seedsPerAcre, 0)} seeds/acre (${o.seedsPerRowFoot} per foot of 30 in row) — ${o.seedUnitsNeeded} units for 160 acres.`,
    how: "Enter the stand you want, germination from the seed tag and realistic emergence for your soil and planting date.",
    assume: "Seeding rate = target ÷ (germination × emergence). Soybean units are 140,000 seeds; corn units 80,000.",
    faq: [["What soybean seeding rate should I use?", "Most university trials find 100,000–120,000 final plants per acre maximizes profit — about 130,000–150,000 seeds planted."]],
  }),
  mk({
    slug: "growing-degree-days-calculator", title: "Growing Degree Days (GDD) Calculator",
    desc: "Calculate growing degree days (GDD/GDU) from daily highs and lows — corn method with 50 °F base and 86 °F cap, or other crop bases — accumulated GDD and days to a crop stage.",
    meta: "GDU Calculator — Growing Degree Days for Corn",
    inputs: [dropdown("crop", "Crop / Base", opts(E.GDD_BASE.map(([n]) => n)), 0), num("high", "Daily High (°F)", 85, 130, 1, -40), num("low", "Daily Low (°F)", 62, 120, 1, -40), num("days", "Days at These Temperatures", 1, 365, 1, 1), num("accumulatedSoFar", "GDD Accumulated So Far", 1100, 10000, 1), num("targetGdd", "Target GDD (e.g. corn silking ≈ 1,400)", 1400, 10000, 10)],
    results: [["dailyGdd", "GDD per Day", "n"], ["accumulatedGdd", "Accumulated GDD", "n"], ["gddRemaining", "GDD Remaining to Target", "n"], ["daysToTarget", "Days to Target at This Rate", "n"], ["periodGdd", "GDD for the Period", "n"]],
    fn: E.gdd, ex: { crop: 0, high: 85, low: 62, days: 1, accumulatedSoFar: 1100, targetGdd: 1400 },
    exText: (o) => `Example: a day of 85/62 °F adds ${o.dailyGdd} GDD to corn; at 1,100 GDD so far, silking (1,400) is about ${o.daysToTarget} days away.`,
    how: "Enter typical highs and lows (or a single day), GDD accumulated since planting and the GDD rating for the stage from your hybrid's spec sheet.",
    assume: "Corn method: highs capped at 86 °F, lows floored at 50 °F, GDD = average − 50. Hybrid maturity ratings are in GDD to black layer (≈ 2,500–2,800).",
    faq: [["How are GDUs calculated for corn?", "((max temp capped at 86 + min temp floored at 50) ÷ 2) − 50, accumulated daily from planting."]],
  }),
  mk({
    slug: "cannabis-yield-calculator", title: "Cannabis Yield Calculator (Licensed Cultivation)",
    desc: "Estimate licensed cannabis cultivation yield — grams per harvest from canopy square feet or lighting watts, pounds per harvest and per year, grams per plant and revenue.",
    inputs: [dropdown("mode", "Estimate From", opts(["Canopy area (g per sq ft)", "Lighting (g per watt)"]), 0), num("canopySqFt", "Flowering Canopy (sq ft)", 1000, 1000000, 1), num("gramsPerSqFt", "Yield (g per sq ft)", 40, 150, 0.5), num("lightWatts", "Flowering Light Watts", 30000, 10000000, 10), num("gramsPerWatt", "Yield (g per watt)", 1.2, 3, 0.05), num("plants", "Plants per Harvest", 1000, 1000000, 1), num("harvestsPerYear", "Harvests per Year", 5, 8, 0.5), cur("pricePerLb", "Wholesale Price per lb", 900, 10000, 10)],
    results: [["poundsPerHarvest", "Pounds per Harvest (dry)", "n"], ["gramsPerHarvest", "Grams per Harvest", "n"], ["annualPounds", "Pounds per Year", "n"], ["annualRevenue", "Annual Wholesale Revenue", "c"], ["gramsPerPlant", "Grams per Plant", "n"], ["gramsPerWatt", "Grams per Watt", "n"]],
    fn: E.cannabisYield, ex: { mode: 0, canopySqFt: 1000, gramsPerSqFt: 40, lightWatts: 30000, gramsPerWatt: 1.2, plants: 1000, harvestsPerYear: 5, pricePerLb: 900 },
    exText: (o) => `Example: 1,000 sq ft of canopy at 40 g per sq ft yields about ${o.poundsPerHarvest} lb per harvest — ${o.annualPounds} lb a year over 5 harvests.`,
    how: "For licensed growers: enter canopy or lighting, your historical yield factors and harvests per year. Follow your state or country's cultivation rules.",
    assume: "Typical indoor commercial yields: 30–60 g per sq ft of canopy, about 1–2 g per watt with modern LEDs. Wholesale prices vary widely by market.",
    faq: [["How much does a cannabis grow yield per square foot?", "Commercial indoor grows commonly produce 30–60 g of dried flower per square foot of canopy per harvest."]],
  }),
  mk({
    slug: "corn-shrink-calculator", title: "Corn Shrink Calculator",
    desc: "Calculate corn moisture shrink — dry bushels from wet weight and harvest moisture to 15.5%, water and handling shrink, elevator pencil shrink comparison, drying charges and net value.",
    inputs: [dropdown("weightUnit", "Wet Weight Entered As", opts(["Pounds", "Wet bushels (56 lb)"]), 1), num("wetWeight", "Wet Weight", 10000, 100000000, 1), pct("harvestMoisture", "Harvest Moisture", 20, 40, 0.1), pct("marketMoisture", "Market Moisture", 15.5, 20, 0.1), pct("handlingShrink", "Handling Shrink", 0.5, 3, 0.1), pct("pencilShrinkPerPoint", "Elevator Shrink per Point", 1.4, 2, 0.05), cur("dryingPerPoint", "Drying Charge per Point per Bushel", 0.04, 0.2, 0.005), cur("price", "Corn Price per Bushel", 4.25, 20, 0.01)],
    results: [["dryBushels", "Dry Bushels at Market Moisture", "n"], ["totalShrinkPercent", "Total Shrink", "p"], ["waterShrinkPercent", "Water Shrink", "p"], ["wetBushels", "Wet Bushels", "n"], ["elevatorPencilShrinkBushels", "Elevator Pencil-Shrink Bushels", "n"], ["dryingCharge", "Drying Charge", "c"], ["netValue", "Net Value after Drying", "c"]],
    fn: E.cornShrink, ex: { weightUnit: 1, wetWeight: 10000, harvestMoisture: 20, marketMoisture: 15.5, handlingShrink: 0.5, pencilShrinkPerPoint: 1.4, dryingPerPoint: 0.04, price: 4.25 },
    exText: (o) => `Example: 10,000 wet bushels at 20% moisture shrink ${o.totalShrinkPercent}% to ${fmt(o.dryBushels, 0)} dry bushels at 15.5%; the elevator's 1.4%/point schedule would pay ${fmt(o.elevatorPencilShrinkBushels, 0)} bu.`,
    how: "Enter scale weight (or wet bushels) and moisture from the elevator ticket, and your elevator's shrink and drying schedule.",
    assume: "True water shrink = (M₁ − M₂) ÷ (100 − M₂) ≈ 1.18% per point at 15.5%; elevators typically use 1.3–1.5% per point to include handling loss.",
    faq: [["How much does corn shrink per point of moisture?", "About 1.18% for water alone; elevator schedules usually charge 1.3–1.5% per point."]],
  }),
  mk({
    slug: "agriculture-conversion-calculator", title: "Agriculture Conversion Calculator",
    desc: "Convert farm units — bushels per acre to tonnes per hectare and back for corn, soybeans, wheat, barley, oats, sorghum, canola and sunflower — plus acres to hectares and lb/acre to kg/ha.",
    inputs: [dropdown("mode", "Convert", opts(["Bushels/acre → tonnes/hectare", "Tonnes/hectare → bushels/acre", "Acres → hectares", "lb/acre → kg/hectare"]), 0), dropdown("crop", "Crop", CROPS, 0), num("value", "Value", 200, 100000000, 0.01)],
    results: [["result", "Result", "n"], ["buPerAcre", "Bushels per Acre", "n"], ["tonnesPerHa", "Tonnes per Hectare", "n"], ["kgPerHa", "kg per Hectare", "n"], ["lbPerAcre", "lb per Acre", "n"]],
    fn: E.agConversion, ex: { mode: 0, crop: 0, value: 200 },
    exText: (o) => `Example: 200 bu/acre of corn is ${o.tonnesPerHa} t/ha (${fmt(o.kgPerHa, 0)} kg/ha).`,
    how: "Choose the conversion and crop (bushel weights differ by crop) and enter a value.",
    assume: "Standard test weights: corn & sorghum 56 lb/bu, soybeans & wheat 60, barley 48, oats 32, canola 50, sunflower 25. 1 lb/acre = 1.12085 kg/ha; 1 acre = 0.4047 ha.",
    faq: [["How do I convert bushels per acre to tonnes per hectare?", "Multiply by the bushel weight and 0.0011208 — for corn, bu/ac × 0.0628."]],
  }),
  mk({
    slug: "grain-emc-calculator", title: "Grain Equilibrium Moisture Content (EMC) Calculator",
    desc: "Calculate the equilibrium moisture content grain will reach with air at a given temperature and humidity — corn, soybeans, wheat, rice, sorghum — to plan aeration and natural-air drying.",
    meta: "Grain EMC Calculator — Clemson-Style Aeration Moisture Chart",
    inputs: [dropdown("grain", "Grain", opts(E.EMC_GRAINS.map(([n]) => n)), 0), num("temperatureF", "Air Temperature (°F)", 50, 120, 1, -20), pct("humidity", "Relative Humidity", 65, 99, 1), pct("grainMoisture", "Current Grain Moisture (wet basis)", 18, 40, 0.1)],
    results: [["emcWetBasisPercent", "Equilibrium Moisture (% wet basis)", "n"], ["emcDryBasisPercent", "Equilibrium Moisture (% dry basis)", "n"], ["dryingPossible", "Air Will Dry This Grain (1 = yes)", "n"], ["temperatureC", "Temperature (°C)", "n"]],
    fn: E.emc, ex: { grain: 0, temperatureF: 50, humidity: 65, grainMoisture: 18 },
    exText: (o) => `Example: 50 °F air at 65% humidity brings shelled corn to about ${o.emcWetBasisPercent}% moisture, so fanning it will dry 18% corn.`,
    how: "Enter the air temperature and humidity going into the fan (fan heat adds 2–5 °F and lowers humidity) and your grain moisture.",
    assume: "ASABE D245.6 modified Henderson equation constants, the same basis as university EMC charts (e.g. Clemson, Purdue, NDSU).",
    faq: [["What is grain EMC?", "The moisture grain eventually reaches when held in air of a given temperature and relative humidity."]],
  }),
  mk({
    slug: "commercial-greenhouse-cost-calculator", title: "Commercial Greenhouse Cost Calculator",
    desc: "Estimate commercial greenhouse cost — structure type (hoop, gutter-connected poly, polycarbonate, glass), heating and cooling, benches and irrigation, supplemental lighting, site prep and permits.",
    inputs: [num("sqFt", "Growing Area (sq ft)", 10000, 10000000, 10), dropdown("type", "Structure", opts(E.GREENHOUSE.map(([n, c]) => `${n} (~$${c}/sq ft)`)), 1), cur("climatePerSqFt", "Heating, Cooling & Controls per sq ft", 9, 100, 0.25), cur("benchesIrrigationPerSqFt", "Benches & Irrigation per sq ft", 4, 50, 0.25), yn("lighting", "Supplemental LED Lighting?"), cur("lightingPerSqFt", "Lighting per sq ft", 12, 100, 0.25), cur("sitePrep", "Site Prep, Foundations & Utilities", 60000, 100000000, 100), cur("permits", "Permits & Engineering", 15000, 10000000, 100), pct("regionAdjust", "Local Price Adjustment (+/− %)", 0, 100, 1)],
    results: [["totalCost", "Estimated Total Cost", "c"], ["costPerSqFt", "All-In Cost per sq ft", "c"], ["structureCost", "Structure", "c"], ["climateControl", "Climate Control", "c"], ["benchesIrrigation", "Benches & Irrigation", "c"], ["lightingCost", "Lighting", "c"], ["lowEstimate", "Low Estimate", "c"], ["highEstimate", "High Estimate", "c"]],
    fn: E.greenhouse, ex: { sqFt: 10000, type: 1, climatePerSqFt: 9, benchesIrrigationPerSqFt: 4, lighting: 0, lightingPerSqFt: 12, sitePrep: 60000, permits: 15000, regionAdjust: 0 },
    exText: (o) => `Example: a 10,000 sq ft gutter-connected poly greenhouse with climate control and benches costs about ${usd(o.totalCost)} — ${usd(o.costPerSqFt)} per sq ft.`,
    how: "Choose the structure, enter the area and adjust system costs to your quotes and crop.",
    assume: "2026 typical installed structure prices: hoop $5–10, gutter-connected poly $20–35, polycarbonate $30–45, glass $45–65 per sq ft before systems.",
    faq: [["How much does a commercial greenhouse cost?", "Usually $25–100 per sq ft fully equipped, depending on glazing and climate systems."]],
  }),
  mk({
    slug: "farm-equipment-lease-calculator", title: "Farm Equipment Lease Calculator",
    desc: "Calculate a farm equipment lease payment — depreciation plus finance charge from equipment cost, residual, term and rate — with total payments, buyout and a loan payment comparison.",
    inputs: [cur("equipmentCost", "Equipment Price", 350000, 100000000, 100), cur("downPayment", "Down Payment / Trade", 35000, 100000000, 100), pct("residualPercent", "Residual Value (% of price)", 45, 90, 1), num("termMonths", "Lease Term (months)", 60, 120, 1, 12), pct("rate", "Lease Rate (APR equivalent)", 7.5, 25, 0.05)],
    results: [["monthlyLeasePayment", "Monthly Lease Payment", "c"], ["annualLeasePayment", "Annual Lease Payment", "c"], ["totalLeasePayments", "Total Lease Payments", "c"], ["residualBuyout", "Residual Buyout", "c"], ["totalCostIfBought", "Total Cost if You Buy Out", "c"], ["monthlyLoanPaymentComparison", "Monthly Loan Payment (same rate & term)", "c"], ["totalLoanCost", "Total Cost with a Loan", "c"]],
    fn: E.equipmentLease, ex: { equipmentCost: 350000, downPayment: 35000, residualPercent: 45, termMonths: 60, rate: 7.5 },
    exText: (o) => `Example: a $350,000 combine with $35,000 down, a 45% residual and 7.5% over 60 months leases for about ${usd(o.monthlyLeasePayment)} a month versus ${usd(o.monthlyLoanPaymentComparison)} on a loan.`,
    how: "Enter the price, down payment or trade, the residual the lessor sets, the term and rate. Most ag leases bill annually — the annual figure is shown too.",
    assume: "Payment = (cap cost − residual) ÷ term + (cap cost + residual) × rate ÷ 2,400 (money factor method). Hour limits and excess-hour charges apply on most leases.",
    faq: [["Is it better to lease or buy farm equipment?", "Leasing lowers payments and keeps equipment new; buying is usually cheaper if you run machines for many years."]],
  }),
  mk({
    slug: "livestock-feed-ration-calculator", title: "Livestock Feed Ration Calculator (Pearson Square)",
    desc: "Balance a two-ingredient feed ration to a target crude protein with the Pearson square — pounds of each feed per batch, mix cost per ton, daily intake and feed cost.",
    meta: "Ration Calculator — Pearson Square Feed Mix",
    inputs: [pct("targetProtein", "Target Crude Protein", 14, 60, 0.1), pct("feedAProtein", "Feed A Protein (e.g. soybean meal 44%)", 44, 80, 0.1), pct("feedBProtein", "Feed B Protein (e.g. corn 9%)", 9, 80, 0.1), num("batchLb", "Batch Size (lb)", 2000, 100000, 1), cur("feedACostTon", "Feed A Cost per Ton", 420, 5000, 1), cur("feedBCostTon", "Feed B Cost per Ton", 170, 5000, 1), num("bodyWeight", "Animal Body Weight (lb)", 600, 3000, 1), pct("intakePercent", "Daily Intake (% of body weight)", 2.5, 5, 0.1), num("head", "Head", 50, 100000, 1, 1)],
    results: [["feedALb", "Feed A in Batch (lb)", "n"], ["feedBLb", "Feed B in Batch (lb)", "n"], ["feedASharePercent", "Feed A Share", "p"], ["mixCostPerTon", "Mix Cost per Ton", "c"], ["dailyIntakeLb", "Daily Intake for Group (lb)", "n"], ["dailyFeedCost", "Daily Feed Cost", "c"], ["feasible", "Target Possible with These Feeds (1 = yes)", "n"]],
    fn: E.pearsonRation, ex: { targetProtein: 14, feedAProtein: 44, feedBProtein: 9, batchLb: 2000, feedACostTon: 420, feedBCostTon: 170, bodyWeight: 600, intakePercent: 2.5, head: 50 },
    exText: (o) => `Example: a 14% protein mix from soybean meal (44%) and corn (9%) needs ${o.feedALb} lb of meal and ${o.feedBLb} lb of corn per ton — ${usd(o.mixCostPerTon)} per ton.`,
    how: "Enter the target protein and each feed's protein (from a feed test or tag), batch size and prices. The target must lie between the two feeds.",
    assume: "Pearson square: parts of each feed = difference between the other feed and the target. Balances protein only — check energy, minerals and vitamins with a nutritionist.",
    faq: [["How does the Pearson square work?", "Subtract diagonally across the square to get parts of each feed that blend to the target nutrient level."]],
  }),
  mk({
    slug: "cattle-gestation-calculator", title: "Cattle Gestation Calculator (Calving Date)",
    desc: "Calculate a cow's calving date from the breeding or AI date by breed — calving window, pregnancy check and dry-off dates, days pregnant and days to calving.",
    meta: "Cow Gestation Calculator — Calving Date for Beef & Dairy",
    inputs: [dateField("breedingDate", "Breeding / AI Date", "today-60"), dropdown("breed", "Breed", opts(E.CATTLE_BREEDS.map(([n, d]) => `${n} (${d} days)`)), 0)],
    results: [["calvingDate", "Expected Calving Date", "d"], ["earliestCalving", "Earliest Likely Calving", "d"], ["latestCalving", "Latest Likely Calving", "d"], ["pregnancyCheckDate", "Pregnancy Check From", "d"], ["dryOffDate", "Dry-Off Date (dairy, −60 days)", "d"], ["daysPregnant", "Days Pregnant Today", "n"], ["daysToCalving", "Days to Calving", "n"], ["gestationDays", "Gestation Length (days)", "n"]],
    fn: E.cattleGestation, ex: { breedingDate: D0, breed: 0 },
    exText: (o) => `Example: a beef cow bred on 2 Nov 2026 is due about ${o.gestationDays} days later, in mid-August 2027, with most calving within ±10 days.`,
    how: "Enter the breeding or AI date and breed. For bull-bred herds use the date the bull went in and out to get a calving window.",
    assume: "Average gestation 283 days for beef cattle (Angus 281, Hereford 285, Brahman ~292) and 279 for Holstein and Jersey; bull calves run 1–2 days longer.",
    faq: [["How long is a cow pregnant?", "About 283 days — roughly 9 months and 10 days."], ["How long is a Jersey cow's gestation?", "About 279 days."]],
  }),
  mk({
    slug: "goat-gestation-calculator", title: "Goat Gestation & Kidding Calculator",
    desc: "Calculate a doe's kidding date from the breeding date — kidding window, ultrasound and CDT booster dates, days pregnant and the next heat if she didn't settle.",
    meta: "Goat Kidding Calculator — Due Date from Breeding",
    inputs: [dateField("breedingDate", "Breeding Date", "today-30"), dropdown("breed", "Breed Type", opts(["Standard / dairy / meat (150 days)", "Nigerian Dwarf / Pygmy (145 days)"]), 0)],
    results: [["kiddingDate", "Expected Kidding Date", "d"], ["earliestKidding", "Earliest Likely Kidding", "d"], ["latestKidding", "Latest Likely Kidding", "d"], ["ultrasoundDate", "Ultrasound From (day 45)", "d"], ["cdtBoosterDate", "CDT Booster (≈ 30 days before)", "d"], ["nextHeatIfOpen", "Watch for Heat if Open", "d"], ["daysPregnant", "Days Pregnant Today", "n"], ["daysToKidding", "Days to Kidding", "n"]],
    fn: E.goatGestation, ex: { breedingDate: D0, breed: 0 },
    exText: () => `Example: a doe bred on 2 Nov 2026 is due about 150 days later — around 1 April 2027.`,
    how: "Enter the breeding date (the day you saw the buck cover her or the doe was hand-bred).",
    assume: "Average goat gestation is 150 days (145–155); miniature breeds average about 145. Does cycle every 18–21 days.",
    faq: [["How long are goats pregnant?", "About 150 days, roughly five months."]],
  }),
  mk({
    slug: "lamb-gestation-calculator", title: "Sheep Gestation & Lambing Calculator",
    desc: "Calculate the lambing window from ram-in and ram-out dates — first, peak and last lambing, heat cycles covered, flushing start and crutching date.",
    meta: "Lamb Gestation Calculator — Lambing Dates from Ram Dates",
    inputs: [dateField("ramInDate", "Ram In Date", "today-30"), dateField("ramOutDate", "Ram Out Date", "today+4"), num("gestationDays", "Gestation Length (days)", 147, 155, 1, 140)],
    results: [["firstLambing", "First Lambs Expected", "d"], ["peakLambingStart", "First-Cycle Lambing Peak", "d"], ["lastLambing", "Last Lambs Expected", "d"], ["lambingSeasonDays", "Lambing Season Length (days)", "n"], ["heatCyclesCovered", "Heat Cycles Covered", "n"], ["flushingStart", "Start Flushing Ewes", "d"], ["shearingOrCrutchingBy", "Crutch / Shear By", "d"]],
    fn: E.lambGestation, ex: { ramInDate: D0, ramOutDate: D0 + 34, gestationDays: 147 },
    exText: (o) => `Example: rams in on 2 Nov 2026 and out 34 days later (${o.heatCyclesCovered} cycles) means lambing from late March to early May 2027 — a ${o.lambingSeasonDays}-day season.`,
    how: "Enter the dates the rams went in and came out. Two heat cycles (34 days) is a common breeding season.",
    assume: "Average sheep gestation 147 days (142–152); ewes cycle every 17 days. Flushing starts about two weeks before rams go in.",
    faq: [["How long is a sheep pregnant?", "About 147 days, close to five months."]],
  }),
  mk({
    slug: "7-day-cidr-protocol-calculator", title: "7-Day CO-Synch + CIDR Protocol Calculator",
    desc: "Schedule the 7-day CO-Synch + CIDR estrus synchronization protocol for beef cows or heifers — GnRH and CIDR in, CIDR out and PGF, timed AI — plus clean-up bull, preg check and calving dates.",
    meta: "7 Day CIDR Protocol Calculator — Timed AI Dates",
    inputs: [dateField("startDate", "Day 0 (GnRH + CIDR In)"), dropdown("animal", "Animals", opts(["Beef cows (TAI 66 ± 2 h after PGF)", "Beef heifers (TAI 54 ± 2 h after PGF)"]), 0)],
    results: [["day0GnrhCidrIn", "Day 0: GnRH + Insert CIDR", "d"], ["day7CidrOutPgf", "Day 7: Remove CIDR + PGF", "d"], ["timedAiDate", "Timed AI + GnRH", "d"], ["hoursAfterPgf", "Hours After PGF for TAI", "n"], ["cleanupBullInDate", "Clean-Up Bull In", "d"], ["pregCheckDate", "Pregnancy Check (from)", "d"], ["expectedCalvingDate", "Expected Calving (AI-sired)", "d"]],
    fn: E.cidr7, ex: { startDate: D0, animal: 0 },
    exText: () => `Example: starting cows on 2 Nov 2026 means pulling CIDRs and giving PGF on 9 Nov and breeding by timed AI on 12 Nov (66 hours later), with AI calves due around 22 Aug 2027.`,
    how: "Pick the Day 0 date that puts the timed AI on a day you can work cattle. Follow the product labels and your veterinarian's protocol.",
    assume: "Protocol per the Beef Reproduction Task Force recommended synchronization protocols: cows TAI at 66 ± 2 h, heifers 54 ± 2 h after CIDR removal and PGF.",
    faq: [["What is the 7-day CO-Synch + CIDR protocol?", "GnRH and a CIDR on day 0, CIDR removal and prostaglandin on day 7, then GnRH with timed AI about 3 days later."]],
  }),
  mk({
    slug: "chicken-feed-calculator", title: "Chicken Feed Calculator",
    desc: "Calculate how much feed your chickens need — layers, broilers, pullets or bantams — pounds and bags over any number of days, cost, eggs produced and feed cost per dozen eggs.",
    meta: "Chicken Calculator — Feed per Day, Bags & Cost per Dozen",
    inputs: [dropdown("type", "Birds", opts(["Laying hens (~0.25 lb/day)", "Broilers / meat birds (~0.27 lb/day avg)", "Pullets (~0.18 lb/day)", "Bantams (~0.2 lb/day)"]), 0), num("birds", "Number of Birds", 12, 1000000), num("days", "Days", 30, 365, 1), pct("waste", "Feed Waste", 10, 50, 1), num("bagSize", "Bag Size (lb)", 50, 100, 1, 1), cur("bagPrice", "Price per Bag", 22, 200, 0.25), pct("layRate", "Laying Rate (layers)", 75, 100, 1)],
    results: [["feedLb", "Feed Needed (lb)", "n"], ["bagsNeeded", "Bags Needed", "n"], ["feedCost", "Feed Cost", "c"], ["feedPerBirdPerDayLb", "Feed per Bird per Day (lb)", "n"], ["eggsProduced", "Eggs Produced", "n"], ["feedCostPerDozen", "Feed Cost per Dozen Eggs", "c"]],
    fn: E.chickenFeed, ex: { type: 0, birds: 12, days: 30, waste: 10, bagSize: 50, bagPrice: 22, layRate: 75 },
    exText: (o) => `Example: 12 laying hens eat about ${o.feedLb} lb in 30 days (${o.bagsNeeded} bags, ${usd(o.feedCost)}) and lay roughly ${o.eggsProduced} eggs — ${usd(o.feedCostPerDozen)} of feed per dozen.`,
    how: "Choose the bird type, flock size and period. Hens eat more in cold weather and when laying heavily.",
    assume: "Typical intake: layers 0.22–0.28 lb/day; broilers eat about 12–15 lb of feed each to reach market weight in 7–8 weeks.",
    faq: [["How much feed does a chicken eat per day?", "About a quarter pound (4 oz) for a laying hen."]],
  }),
  mk({
    slug: "hay-calculator", title: "Hay Calculator",
    desc: "Calculate how much hay you need for cattle, dairy cows, horses, sheep or goats — daily intake, feeding days, waste by feeding method — bales, tons and cost per head per day.",
    meta: "Hay Calculator — Bales Needed for Winter",
    inputs: [dropdown("animal", "Animal", opts(E.HAY_ANIMALS.map(([n]) => n)), 0), num("head", "Number of Animals", 30, 100000, 1), pct("intakePercent", "Hay Intake (% of body weight)", 2.5, 4, 0.1), num("days", "Days of Hay Feeding", 150, 365, 1), pct("waste", "Storage & Feeding Waste", 15, 60, 1), num("baleWeight", "Bale Weight (lb)", 1200, 2000, 5, 30), cur("pricePerTon", "Hay Price per Ton", 120, 1000, 1)],
    results: [["balesNeeded", "Bales Needed", "n"], ["totalTons", "Total Hay (tons)", "n"], ["lbPerDay", "Hay per Day for Group (lb)", "n"], ["balesPerWeek", "Bales per Week", "n"], ["totalCost", "Total Hay Cost", "c"], ["costPerHeadPerDay", "Cost per Head per Day", "c"]],
    fn: E.hay, ex: { animal: 0, head: 30, intakePercent: 2.5, days: 150, waste: 15, baleWeight: 1200, pricePerTon: 120 },
    exText: (o) => `Example: 30 beef cows eating 2.5% of body weight for 150 days need about ${o.balesNeeded} round bales of 1,200 lb (${o.totalTons} tons) with 15% waste — ${usd(o.costPerHeadPerDay)} per cow per day.`,
    how: "Enter animals, intake (cattle 2–2.5%, horses 2%, lactating dairy higher), feeding days and your bale weight.",
    assume: "Waste: covered storage and ring feeders ~10–15%; outside storage and unrestricted feeding can exceed 30%.",
    faq: [["How many round bales does a cow eat in winter?", "About one 1,200 lb bale every 2–3 weeks per cow, depending on waste and quality."]],
  }),
  mk({
    slug: "cattle-breakeven-calculator", title: "Cattle Breakeven & Farm Profit Calculator",
    desc: "Calculate the breakeven sale price for stocker or feeder cattle — purchase cost, cost of gain, vet, freight, interest and death loss — with profit per head at your expected price.",
    meta: "Cattle Breakeven Calculator — Feeder & Stocker Profit",
    inputs: [num("purchaseWeight", "Purchase Weight (lb)", 550, 2000, 5), cur("purchasePrice", "Purchase Price ($/cwt)", 340, 1000, 0.5), num("saleWeight", "Sale Weight (lb)", 850, 2500, 5), cur("costOfGain", "Cost of Gain ($/lb)", 1.1, 5, 0.01), num("days", "Days Owned", 150, 730, 1), cur("vetMed", "Vet & Medicine per Head", 35, 500, 1), cur("freightCommission", "Freight & Commission per Head", 45, 500, 1), cur("otherCosts", "Other Costs per Head", 20, 1000, 1), pct("interestRate", "Interest Rate", 8, 25, 0.1), pct("deathLoss", "Death Loss", 1.5, 20, 0.1), cur("expectedSalePrice", "Expected Sale Price ($/cwt)", 300, 1000, 0.5), num("head", "Head", 100, 100000, 1, 1)],
    results: [["breakevenPerCwt", "Breakeven Sale Price ($/cwt)", "c"], ["profitPerHead", "Profit per Head", "c"], ["totalProfit", "Total Profit", "c"], ["totalCostPerHead", "Total Cost per Head", "c"], ["revenuePerHead", "Revenue per Head", "c"], ["costOfGainTotal", "Gain Cost per Head", "c"], ["interestCost", "Interest per Head", "c"]],
    fn: E.cattleBreakeven, ex: { purchaseWeight: 550, purchasePrice: 340, saleWeight: 850, costOfGain: 1.1, days: 150, vetMed: 35, freightCommission: 45, otherCosts: 20, interestRate: 8, deathLoss: 1.5, expectedSalePrice: 300, head: 100 },
    exText: (o) => `Example: 550 lb steers bought at $340/cwt and sold at 850 lb break even at ${usd(o.breakevenPerCwt)}/cwt; selling at $300 makes ${usd(o.profitPerHead)} per head.`,
    how: "Enter purchase and expected sale weights and prices, cost of gain (feed + yardage per lb gained) and other costs.",
    assume: "Interest on the calf plus half the gain cost over the ownership period; death loss charged on purchase cost. Shrink at sale is not deducted — use pay weight.",
    faq: [["How do you calculate a cattle breakeven?", "Total cost per head ÷ sale weight in cwt gives the price you need to cover costs."]],
  }),
  mk({
    slug: "aum-calculator", title: "AUM Calculator (Animal Unit Months)",
    desc: "Calculate animal unit months needed for a grazing season and AUMs your pasture can supply — by animal type, head, months, acres, forage production and utilization — with stocking and lease cost.",
    meta: "AUM Calculator — Stocking Rate & Grazing Capacity",
    inputs: [dropdown("animal", "Animal", opts(E.AU.map(([n, a]) => `${n} (${a} AU)`)), 1), num("head", "Number of Animals", 50, 100000, 1), num("months", "Grazing Months", 6, 12, 0.5), num("acres", "Pasture Acres", 640, 10000000, 1), num("forageLbPerAcre", "Forage Production (lb DM/acre)", 2500, 20000, 50), pct("utilization", "Harvest Efficiency (take half, leave half)", 50, 80, 1), cur("pricePerAum", "Pasture Lease Price per AUM", 32, 200, 0.5)],
    results: [["aumsNeeded", "AUMs Needed", "n"], ["aumsAvailable", "AUMs Available", "n"], ["enoughForage", "Enough Forage (1 = yes)", "n"], ["animalUnits", "Animal Units", "n"], ["supportedHeadForPeriod", "Head the Pasture Supports", "n"], ["acresPerAum", "Acres per AUM", "n"], ["grazingCost", "Grazing Lease Cost", "c"]],
    fn: E.aum, ex: { animal: 1, head: 50, months: 6, acres: 640, forageLbPerAcre: 2500, utilization: 50, pricePerAum: 32 },
    exText: (o) => `Example: 50 cow-calf pairs for 6 months need ${o.aumsNeeded} AUMs; 640 acres producing 2,500 lb/acre at 50% use supply ${o.aumsAvailable} AUMs — enough for about ${o.supportedHeadForPeriod} pairs.`,
    how: "Choose the animal class, herd size and season, then pasture acres and forage production (clip plots or NRCS ecological site data).",
    assume: "1 AUM = forage for a 1,000 lb cow for a month ≈ 780 lb of dry matter (26 lb/day). Animal unit equivalents per NRCS guidance.",
    faq: [["What is an AUM?", "An animal unit month — the forage one 1,000 lb cow (with or without a small calf) eats in a month."]],
  }),
  mk({
    slug: "fcr-calculator", title: "FCR Calculator (Feed Conversion Ratio)",
    desc: "Calculate feed conversion ratio and feed efficiency for cattle, pigs, poultry or fish — feed fed versus weight gained — with cost of gain and average daily gain.",
    inputs: [dropdown("mode", "Gain Entered As", opts(["Weight gain", "Start and end weights"]), 1), num("weightGain", "Weight Gain (lb or kg)", 300, 10000000, 0.1), num("startWeight", "Start Weight", 600, 10000000, 0.1), num("endWeight", "End Weight", 900, 10000000, 0.1), num("feedConsumed", "Feed Consumed (same unit)", 1800, 100000000, 0.1), cur("feedCostPerUnit", "Feed Cost per lb (or kg)", 0.14, 10, 0.001), num("days", "Days on Feed", 100, 1000, 1)],
    results: [["feedConversionRatio", "Feed Conversion Ratio (feed ÷ gain)", "n"], ["feedEfficiency", "Feed Efficiency (gain ÷ feed)", "n"], ["weightGain", "Weight Gain", "n"], ["costOfGainPerUnit", "Feed Cost of Gain per lb/kg", "c"], ["totalFeedCost", "Total Feed Cost", "c"], ["averageDailyGain", "Average Daily Gain", "n"]],
    fn: E.fcr, ex: { mode: 1, weightGain: 300, startWeight: 600, endWeight: 900, feedConsumed: 1800, feedCostPerUnit: 0.14, days: 100 },
    exText: (o) => `Example: a steer gaining 300 lb on 1,800 lb of feed has an FCR of ${o.feedConversionRatio}:1 — ${usd(o.costOfGainPerUnit)} of feed per lb of gain and ${o.averageDailyGain} lb ADG.`,
    how: "Enter feed delivered and weight gained over the same period, using the same unit (lb or kg) for both.",
    assume: "Typical FCRs: broilers ~1.5–1.7, pigs ~2.6–3.0, feedlot cattle ~5.5–7 (dry matter), farmed fish ~1.2–1.5.",
    faq: [["What is a good FCR?", "Lower is better; it depends on species — broilers under 1.7 and finishing cattle around 6 are good."]],
  }),
  mk({
    slug: "sheep-profit-calculator", title: "Sheep Profit Calculator",
    desc: "Estimate sheep flock profit — lambing and survival rates, replacements kept, lamb sale weight and price, wool and cull ewe income against cost per ewe — with profit per ewe and breakeven lamb price.",
    inputs: [num("ewes", "Ewes Exposed", 100, 100000, 1), pct("lambingRate", "Lambing Rate (lambs born per ewe × 100)", 150, 300, 1), pct("survival", "Lamb Survival to Sale", 90, 100, 1), pct("replacementRate", "Replacement Rate (ewe lambs kept)", 20, 50, 1), num("saleWeight", "Lamb Sale Weight (lb)", 110, 200, 1), cur("pricePerCwt", "Lamb Price ($/cwt)", 250, 1000, 0.5), num("woolLb", "Wool per Ewe (lb)", 7, 30, 0.1), cur("woolPrice", "Wool Price per lb", 0.5, 20, 0.01), cur("cullValue", "Cull Ewe Value", 150, 1000, 1), cur("costPerEwe", "Annual Cost per Ewe (feed, vet, labor, shearing…)", 210, 2000, 1)],
    results: [["totalProfit", "Flock Profit", "c"], ["profitPerEwe", "Profit per Ewe", "c"], ["lambsSold", "Lambs Sold", "n"], ["totalRevenue", "Total Revenue", "c"], ["lambRevenue", "Lamb Revenue", "c"], ["totalCosts", "Total Costs", "c"], ["breakevenLambPricePerCwt", "Breakeven Lamb Price ($/cwt)", "c"]],
    fn: E.sheepProfit, ex: { ewes: 100, lambingRate: 150, survival: 90, replacementRate: 20, saleWeight: 110, pricePerCwt: 250, woolLb: 7, woolPrice: 0.5, cullValue: 150, costPerEwe: 210 },
    exText: (o) => `Example: 100 ewes lambing at 150% sell ${o.lambsSold} lambs at 110 lb and $250/cwt; with wool and culls the flock makes ${usd(o.totalProfit)} (${usd(o.profitPerEwe)} per ewe) — breakeven ${usd(o.breakevenLambPricePerCwt)}/cwt.`,
    how: "Enter flock size and performance, prices and an honest annual cost per ewe.",
    assume: "Lambs sold = ewes × lambing rate × survival − replacements kept; culls equal replacements. Lambs weaned per ewe is the biggest profit driver.",
    faq: [["How profitable are sheep?", "Margins depend mostly on lambs marketed per ewe and feed cost; many flocks net $25–100 per ewe."]],
  }),
  mk({
    slug: "prf-insurance-calculator", title: "PRF Insurance Calculator (Pasture, Rangeland, Forage)",
    desc: "Estimate USDA Pasture, Rangeland, Forage (PRF) rainfall index insurance — policy protection, producer premium after subsidy and indemnity if the rainfall index falls below your coverage.",
    meta: "PRF Insurance Calculator — Premium & Indemnity Estimate",
    inputs: [num("acres", "Insured Acres", 1000, 10000000, 1), cur("countyBaseValue", "County Base Value ($/acre)", 30, 500, 0.01), dropdown("coverageLevel", "Coverage Level", [["70%", 70], ["75%", 75], ["80%", 80], ["85%", 85], ["90%", 90]], 90), pct("productivityFactor", "Productivity Factor", 150, 150, 1), pct("intervalShare", "Share of Value in This Interval", 50, 60, 1), pct("premiumRate", "Interval Premium Rate (from RMA)", 18, 60, 0.1), pct("finalIndex", "Final Grid Rainfall Index (% of normal)", 65, 300, 0.1)],
    results: [["producerPremium", "Producer Premium (after subsidy)", "c"], ["estimatedIndemnity", "Estimated Indemnity", "c"], ["netReturn", "Indemnity minus Premium", "c"], ["policyProtection", "Total Policy Protection", "c"], ["intervalProtection", "Protection in This Interval", "c"], ["totalPremium", "Total Premium (before subsidy)", "c"], ["subsidyPercent", "Premium Subsidy", "p"]],
    fn: E.prfInsurance, ex: { acres: 1000, countyBaseValue: 30, coverageLevel: 90, productivityFactor: 150, intervalShare: 50, premiumRate: 18, finalIndex: 65 },
    exText: (o) => `Example: 1,000 acres at a $30 base value, 90% coverage and 150% productivity has ${usd(o.policyProtection)} of protection; insuring half in one interval costs ${usd(o.producerPremium)}, and a 65% rainfall index would pay about ${usd(o.estimatedIndemnity)}.`,
    how: "Get your grid's county base value and interval premium rates from the USDA RMA PRF Decision Support Tool, then test rainfall outcomes.",
    assume: "Indemnity = interval protection × (coverage − index) ÷ coverage when the index is below coverage. Subsidy: 59% at 70–75%, 55% at 80–85%, 51% at 90%. Each interval is limited to 60% of value and at least two intervals must be chosen.",
    faq: [["How does PRF insurance pay?", "It pays when the NOAA rainfall index for your grid and two-month interval falls below your chosen coverage level — no loss adjustment needed."]],
  }),
  mk({
    slug: "black-walnut-tree-value-calculator", title: "Black Walnut Tree Value Calculator",
    desc: "Estimate what a black walnut tree is worth for timber — Doyle board feet from diameter and log length, log grade price, mill value and the stumpage a landowner might receive.",
    inputs: [num("dbh", "Diameter at Breast Height (in)", 22, 60, 0.5, 8), num("topDiameter", "Small-End Log Diameter (in, 0 = estimate)", 0, 60, 0.5), num("logLength", "Merchantable Log Length (ft)", 16, 40, 1, 8), num("logs", "Number of Logs", 1, 10, 1, 1), dropdown("grade", "Log Grade", opts(E.WALNUT_GRADES.map(([n, p]) => `${n} (~$${p}/bf)`)), 1), pct("stumpageShare", "Landowner Share (stumpage % of mill price)", 60, 100, 1)],
    results: [["estimatedStumpageValue", "Estimated Value to Landowner", "c"], ["millValue", "Delivered Mill Value", "c"], ["doyleBoardFeet", "Volume (Doyle board feet)", "n"], ["topDiameterUsed", "Small-End Diameter Used (in)", "n"], ["valuePerBoardFoot", "Value per Board Foot", "c"]],
    fn: E.blackWalnut, ex: { dbh: 22, topDiameter: 0, logLength: 16, logs: 1, grade: 1, stumpageShare: 60 },
    exText: (o) => `Example: a 22 in DBH walnut with one 16 ft #1 log scales about ${fmt(o.doyleBoardFeet, 0)} board feet — roughly ${usd(o.estimatedStumpageValue)} to the landowner.`,
    how: "Measure diameter 4.5 ft above ground and estimate clear, straight log length. Get a forester or several buyers to grade and bid on valuable trees.",
    assume: "Doyle log rule: (D − 4)² × L ÷ 16; small-end diameter ≈ 85% of DBH. Prices are illustrative — veneer logs can bring far more, and yard trees with metal inside far less.",
    faq: [["How much is a black walnut tree worth?", "From under $100 for small or defective trees to several thousand dollars for large veneer-quality logs."]],
  }),
  mk({
    slug: "auger-calculator", title: "Grain Auger Length & Capacity Calculator",
    desc: "Find the grain auger length you need for a bin — height and angle give length and reach — plus bushels per hour by auger diameter, horsepower estimate and time to fill the bin.",
    meta: "Auger Length Calculator — Bin Height, Angle & Capacity (Brandt-Style)",
    inputs: [num("height", "Bin Eave / Peak Height to Clear (ft)", 30, 150, 0.5), num("clearance", "Extra Clearance Over the Fill Hole (ft)", 3, 10, 0.5), num("angle", "Auger Angle (°)", 30, 45, 1, 10), dropdown("diameter", "Auger Diameter", opts(E.AUGER_CAP.map(([n, c]) => `${n} (~${c.toLocaleString("en-US")} bu/h at 30°)`)), 2), yn("wetGrain", "Wet Grain (−25% capacity)?"), num("binBushels", "Bin Capacity (bu)", 20000, 1000000, 100)],
    results: [["requiredLengthFt", "Required Auger Length (ft)", "n"], ["recommendedStockLengthFt", "Nearest Standard Length (ft)", "n"], ["horizontalReachFt", "Horizontal Reach (ft)", "n"], ["capacityBuPerHour", "Capacity (bu/h)", "n"], ["estimatedHp", "Estimated Horsepower", "n"], ["hoursToFillBin", "Hours to Fill Bin", "n"]],
    fn: E.auger, ex: { height: 30, clearance: 3, angle: 30, diameter: 2, wetGrain: 0, binBushels: 20000 },
    exText: (o) => `Example: clearing a 30 ft bin at a 30° angle takes a ${o.requiredLengthFt} ft auger (a ${o.recommendedStockLengthFt} ft model) reaching ${o.horizontalReachFt} ft out; a 10 in auger moves about ${fmt(o.capacityBuPerHour, 0)} bu/h.`,
    how: "Enter the height you need to clear, the angle you'll run (30–35° is ideal for capacity) and the auger size. Check the manufacturer's capacity chart. Independent tool — not affiliated with Brandt.",
    assume: "Length = height ÷ sin(angle). Capacity falls about 1.5% per degree above 30° and ~25% with wet grain; horsepower is a rough rule of thumb.",
    faq: [["What length auger do I need for a 30 ft bin?", "At 30°, about 66 ft — most farmers would choose a 71 ft auger."]],
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
