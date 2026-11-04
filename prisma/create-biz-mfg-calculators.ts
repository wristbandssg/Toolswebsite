// One-time (but safe to re-run) batch setup script: creates 38 metals, fabrication, machining, quality
// and production-costing calculators (Business & Industrial Calculators > Manufacturing, Metals &
// Engineering Calculators). Formulas and tables live in src/lib/calc-engine-biz-mfg.ts; examples are
// computed from the engine. Merged keywords (no separate page): Silver Price, Scrap Silver → silver-
// price; Steel Plate, Steel Calculator Weight → metal-weight; Brake Tonnage → press-brake-tonnage;
// Milling Feed Rate, IPT → milling-speed-feed; Belt Calculator WCP → timing-belt; Drying Equipment ROI →
// equipment-roi. Near-namesakes kept distinct: punch-forming-tonnage (shear force for punching /
// blanking) vs press-brake-tonnage (air-bend force); silver-price (any purity, payout) vs the existing
// sterling-silver-value tool.
//
// HOW TO RUN (after prisma/setup-business-industrial-category.ts --apply)
//   npx tsx prisma/create-biz-mfg-calculators.ts
// or
//   npm run db:create-biz-mfg-calculators

import * as E from "../src/lib/calc-engine-biz-mfg";

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

const CAT = "manufacturing-metals-engineering-calculators";
const NOTE = "Estimates for planning and quoting — verify against supplier data, drawings and the applicable standard before production or purchase.";

const MAT = (def = 0) => dropdown("material", "Material", opts(E.DENSITY.map(([n, d]) => `${n} (${d} lb/in³)`)), def);

const TOOLS: ToolDef[] = [
  mk({
    slug: "silver-price-calculator", title: "Silver Price & Scrap Silver Calculator",
    desc: "Calculate what your silver is worth — melt value from weight, purity (.999, sterling, 90% coin, .800, war nickels) and spot price — plus the typical dealer payout and value per gram.",
    meta: "Scrap Silver Calculator — Silver Value by Gram & Purity",
    inputs: [num("weight", "Weight", 100, 1000000, 0.01), dropdown("unit", "Unit", opts(["Grams", "Troy ounces", "Pennyweight (dwt)", "Ounces (avoirdupois)", "Kilograms"]), 0), dropdown("purity", "Purity", opts([...E.SILVER_PURITY.map(([n]) => n), "Custom"]), 1), pct("customPurity", "Custom Purity (%)", 92.5, 100, 0.1), cur("spotPrice", "Silver Spot Price per Troy oz", 38, 500, 0.01), pct("payoutPercent", "Dealer Payout (% of melt)", 80, 100, 1)],
    results: [["meltValue", "Melt Value", "c"], ["expectedPayout", "Expected Dealer Payout", "c"], ["pureSilverOzt", "Pure Silver (troy oz)", "n"], ["pureSilverGrams", "Pure Silver (g)", "n"], ["valuePerGram", "Value per Gram (as weighed)", "c"], ["totalTroyOunces", "Total Weight (troy oz)", "n"]],
    fn: E.silverValue, ex: { weight: 100, unit: 0, purity: 1, customPurity: 92.5, spotPrice: 38, payoutPercent: 80 },
    exText: (o) => `Example: 100 g of sterling contains ${o.pureSilverOzt} troy oz of silver — worth ${usd(o.meltValue)} at $38/oz spot, or about ${usd(o.expectedPayout)} at an 80% payout.`,
    how: "Weigh your silver, choose its purity (look for the stamp) and enter today's spot price.",
    assume: "Melt value = weight in troy oz × purity × spot. 1 troy oz = 31.1035 g. Dealers typically pay 70–90% of melt for scrap and more for bullion.",
    faq: [["How much is a gram of sterling silver worth?", "Spot price ÷ 31.1 × 0.925 — about $1.13 per gram at $38 spot."]],
  }),
  mk({
    slug: "alloy-calculator", title: "Gold Alloy Calculator",
    desc: "Calculate how much alloy to add to lower gold to a target karat, or how much fine gold to add to raise it — with final weight, pure gold content and fineness.",
    inputs: [num("weight", "Starting Gold Weight (g)", 10, 100000, 0.01), num("currentKarat", "Current Karat", 24, 24, 0.5), num("targetKarat", "Target Karat", 14, 24, 0.5, 1)],
    results: [["alloyToAddGrams", "Alloy to Add (g)", "n"], ["fineGoldToAddGrams", "Fine Gold to Add (g)", "n"], ["finalWeightGrams", "Final Weight (g)", "n"], ["pureGoldGrams", "Pure Gold (g)", "n"], ["finalPurityPercent", "Final Purity (%)", "n"], ["fineness", "Fineness (parts per 1,000)", "n"]],
    fn: E.alloyMix, ex: { weight: 10, currentKarat: 24, targetKarat: 14 },
    exText: (o) => `Example: to turn 10 g of 24K into 14K, add ${o.alloyToAddGrams} g of alloy for a final ${o.finalWeightGrams} g at ${o.fineness} fineness.`,
    how: "Enter the gold weight, its current karat and the karat you want. Lower karats need alloy added; higher need fine (24K) gold.",
    assume: "Pure gold mass is conserved; karat = 24 × gold fraction. Commercial 14K is often made slightly above 583 fineness to ensure it assays at 14K.",
    faq: [["How do you make 14K gold from 24K?", "Mix 14 parts gold with 10 parts alloy — 10 g of 24K plus about 7.14 g of alloy."]],
  }),
  mk({
    slug: "metal-weight-calculator", title: "Metal & Steel Weight Calculator",
    desc: "Calculate the weight of steel, stainless, aluminum, brass, copper or titanium plate, bar, tube and angle — weight each, per foot, total and cost.",
    meta: "Steel Weight Calculator — Plate, Bar, Tube & Angle",
    inputs: [dropdown("shape", "Shape", opts(E.SHAPES), 0), MAT(0), num("thickness", "Thickness / Wall (in)", 0.25, 24, 0.001), num("width", "Width (in, plate & flat bar)", 48, 240, 0.01), num("diameter", "Diameter / OD / Size / Leg (in)", 2, 120, 0.001), num("length", "Length (ft)", 8, 1000, 0.01), num("quantity", "Quantity", 1, 100000, 1, 1), cur("pricePerLb", "Price per lb", 0.65, 100, 0.01)],
    results: [["totalWeightLb", "Total Weight (lb)", "n"], ["weightEachLb", "Weight Each (lb)", "n"], ["weightPerFootLb", "Weight per Foot (lb)", "n"], ["totalWeightKg", "Total Weight (kg)", "n"], ["crossSectionSqIn", "Cross-Section (in²)", "n"], ["totalCost", "Total Cost", "c"]],
    fn: E.metalWeight, ex: { shape: 0, material: 0, thickness: 0.25, width: 48, diameter: 2, length: 8, quantity: 1, pricePerLb: 0.65 },
    exText: (o) => `Example: a 1/4 in × 48 in × 8 ft steel plate weighs ${fmt(o.weightEachLb, 1)} lb (${o.weightPerFootLb} lb per foot).`,
    how: "Choose the shape and material, then enter the dimensions that apply (thickness and width for plate; diameter or size for bars; OD and wall for tubes; leg and thickness for angle).",
    assume: "Weight = cross-section × length × density. Steel plate: 40.8 lb per sq ft per inch of thickness.",
    faq: [["How much does a 4×8 sheet of 1/4 steel weigh?", "About 327 lb."]],
  }),
  mk({
    slug: "coil-length-calculator", title: "Coil Length Calculator",
    desc: "Calculate the length of a steel, aluminum or copper coil from its OD, ID and thickness — or from coil weight — with weight, area, PIW and wraps.",
    meta: "Coil Calculator — Length & Weight of Steel Coil",
    inputs: [dropdown("mode", "Calculate From", opts(["Coil OD and ID", "Coil weight"]), 0), MAT(0), num("outerDiameter", "Outside Diameter (in)", 60, 120, 0.1), num("innerDiameter", "Inside Diameter (in)", 20, 60, 0.1), num("thickness", "Thickness (in)", 0.036, 1, 0.001), num("width", "Width (in)", 48, 120, 0.01), num("coilWeight", "Coil Weight (lb)", 20000, 100000, 1)],
    results: [["coilLengthFt", "Coil Length (ft)", "n"], ["coilLengthM", "Coil Length (m)", "n"], ["coilWeightLb", "Coil Weight (lb)", "n"], ["squareFeet", "Area (sq ft)", "n"], ["piwLbPerInchWidth", "PIW (lb per inch of width)", "n"], ["wraps", "Number of Wraps", "n"]],
    fn: E.coilLength, ex: { mode: 0, material: 0, outerDiameter: 60, innerDiameter: 20, thickness: 0.036, width: 48, coilWeight: 20000 },
    exText: (o) => `Example: a 60 in OD × 20 in ID coil of 0.036 in × 48 in steel holds about ${fmt(o.coilLengthFt, 0)} ft and weighs ${fmt(o.coilWeightLb, 0)} lb.`,
    how: "Enter the coil's outside and inside diameter and strip thickness, or switch to weight mode and enter the coil tag weight and width.",
    assume: "Length = π (OD² − ID²) ÷ (4 × thickness); assumes tight winding.",
    faq: [["How do you calculate coil length?", "Length = π × (OD² − ID²) ÷ (4 × thickness), all in the same units."]],
  }),
  mk({
    slug: "sheet-metal-gauge-calculator", title: "Sheet Metal Gauge Calculator (Gauge to mm)",
    desc: "Convert sheet metal gauge to thickness in inches and mm for steel, galvanized, stainless and aluminum — or find the nearest gauge for a thickness — with weight per square foot.",
    meta: "Gauge to mm Calculator — Sheet Metal Thickness Chart",
    inputs: [dropdown("mode", "Convert", opts(["Gauge → thickness", "Millimeters → nearest gauge"]), 0), dropdown("material", "Material", opts(["Steel (Manufacturers' Standard)", "Galvanized steel", "Stainless steel", "Aluminum (B&S)"]), 0), num("gauge", "Gauge (7–30)", 16, 30, 1, 7), num("millimeters", "Thickness (mm)", 1.5, 6, 0.01)],
    results: [["thicknessMm", "Thickness (mm)", "n"], ["thicknessIn", "Thickness (in)", "n"], ["gauge", "Gauge", "n"], ["weightPerSqFtLb", "Weight (lb per sq ft)", "n"], ["notStandard", "Not a Standard Gauge (1 = yes)", "n"]],
    fn: E.sheetGauge, ex: { mode: 0, material: 0, gauge: 16, millimeters: 1.5 },
    exText: (o) => `Example: 16 gauge steel is ${o.thicknessIn} in (${o.thicknessMm} mm) thick and weighs ${o.weightPerSqFtLb} lb per sq ft.`,
    how: "Pick the material — gauge thickness differs between steel, galvanized, stainless and aluminum — then enter a gauge or a thickness in mm.",
    assume: "Standard US gauge tables; mills hold tolerances of roughly ±0.003–0.007 in.",
    faq: [["How thick is 16 gauge?", "0.0598 in (1.52 mm) for steel, 0.0625 in for stainless and 0.0508 in for aluminum."]],
  }),
  mk({
    slug: "steel-plate-load-capacity-calculator", title: "Steel Plate Load Capacity Calculator",
    desc: "Check the load a flat steel or aluminum plate can carry when simply supported on four edges — max bending stress, allowable uniform and total load, deflection — using Roark's formulas.",
    inputs: [num("length", "Plate Span — Long Side (in)", 48, 1000, 0.25), num("width", "Plate Span — Short Side (in)", 24, 1000, 0.25), num("thickness", "Thickness (in)", 0.25, 6, 0.0625), dropdown("grade", "Material", opts(E.PLATE_GRADES.map(([n]) => n)), 0), dropdown("loadMode", "Load Entered As", opts(["Uniform pressure (psi)", "Total load spread evenly (lb)"]), 1), num("pressure", "Uniform Pressure (psi)", 2, 10000, 0.1), num("totalLoad", "Total Load (lb)", 2000, 10000000, 10), num("safetyFactor", "Safety Factor on Yield", 1.67, 5, 0.01, 1)],
    results: [["passes", "Passes (1 = yes)", "n"], ["utilizationPercent", "Stress Utilization", "p"], ["maxStressPsi", "Max Bending Stress (psi)", "n"], ["allowableStressPsi", "Allowable Stress (psi)", "n"], ["allowableTotalLoadLb", "Allowable Total Load (lb)", "n"], ["allowableUniformPsi", "Allowable Uniform Load (psi)", "n"], ["maxDeflectionIn", "Max Deflection (in)", "n"]],
    fn: E.plateLoad, ex: { length: 48, width: 24, thickness: 0.25, grade: 0, loadMode: 1, pressure: 2, totalLoad: 2000, safetyFactor: 1.67 },
    exText: (o) => `Example: a 1/4 in A36 plate spanning 48 × 24 in on four edges carrying 2,000 lb evenly reaches ${fmt(o.maxStressPsi, 0)} psi (${o.utilizationPercent}% of allowable); it can take about ${fmt(o.allowableTotalLoadLb, 0)} lb.`,
    how: "Enter the clear spans, thickness and grade, and the load. Concentrated loads (wheels, point loads) produce much higher stress — this tool covers evenly spread loads only.",
    assume: "Roark Table 11.4 case 1a (simply supported, uniform load, ν = 0.3); small-deflection theory, so very thin plates under high load will be conservative. Allowable stress = Fy ÷ safety factor.",
    faq: [["How much weight can a steel plate hold?", "It depends on span and thickness; doubling thickness raises capacity about four times."]],
  }),
  mk({
    slug: "steel-i-beam-cost-calculator", title: "Steel I-Beam Cost Calculator",
    desc: "Estimate the cost of steel I-beams (W shapes) — weight by size and length, steel price per pound, fabrication, delivery and installation — per beam and per foot.",
    inputs: [dropdown("shape", "Beam Size", opts(E.W_SHAPES.map(([n]) => n)), 2), num("customWeight", "Custom Weight (lb/ft)", 35, 1000, 0.1), num("length", "Length per Beam (ft)", 20, 120, 0.5), num("quantity", "Number of Beams", 1, 1000, 1, 1), cur("pricePerLb", "Steel Price per lb", 1.1, 10, 0.01), cur("fabricationEach", "Fabrication per Beam (cuts, holes, plates, paint)", 250, 10000, 5), cur("installEach", "Installation per Beam (crew, crane)", 600, 50000, 10), cur("delivery", "Delivery", 250, 10000, 5)],
    results: [["totalCost", "Estimated Total Cost", "c"], ["costPerBeam", "Cost per Beam", "c"], ["costPerFoot", "Cost per Foot (installed)", "c"], ["steelCost", "Steel", "c"], ["fabricationCost", "Fabrication", "c"], ["installationCost", "Installation", "c"], ["totalWeightLb", "Total Weight (lb)", "n"]],
    fn: E.iBeamCost, ex: { shape: 2, customWeight: 35, length: 20, quantity: 1, pricePerLb: 1.1, fabricationEach: 250, installEach: 600, delivery: 250 },
    exText: (o) => `Example: one 20 ft W8×31 beam weighs ${o.totalWeightLb} lb; steel, fabrication, delivery and installation come to about ${usd(o.totalCost)} — ${usd(o.costPerFoot)} per foot.`,
    how: "Pick the beam size from your engineer's drawings (the second number is lb per foot), enter length and count, and local prices.",
    assume: "2026 typical mill-to-service-center structural steel ~$0.90–1.40 per lb; residential beam installs often cost $100–300 per linear foot all-in.",
    faq: [["How much does a steel I-beam cost?", "Material is roughly $10–40 per foot for residential sizes; installed cost is often $100–300 per foot."]],
  }),
  mk({
    slug: "flexo-plate-distortion-calculator", title: "Flexo Plate Distortion Calculator",
    desc: "Calculate the flexographic plate distortion factor — K factor from plate thickness, repeat length from cylinder teeth or circumference — and the shortened artwork length.",
    inputs: [num("plateThickness", "Plate Thickness incl. Backing (in)", 0.067, 0.25, 0.001), dropdown("repeatMode", "Repeat Entered As", opts(["Repeat length (in)", "Gear teeth × pitch"]), 1), num("repeat", "Print Repeat (in)", 12, 100, 0.001), num("teeth", "Cylinder Gear Teeth", 96, 500, 1, 10), num("pitch", "Gear Circular Pitch (in, 1/8 CP = 0.125)", 0.125, 0.5, 0.001), num("imageLength", "Design Length Around the Cylinder (in)", 11.5, 100, 0.001)],
    results: [["distortionFactorPercent", "Distortion Factor (%)", "n"], ["artworkLengthIn", "Distorted Artwork Length (in)", "n"], ["reductionIn", "Reduction (in)", "n"], ["kFactor", "K Factor (in)", "n"], ["repeatLengthIn", "Repeat Length (in)", "n"]],
    fn: E.flexoDistortion, ex: { plateThickness: 0.067, repeatMode: 1, repeat: 12, teeth: 96, pitch: 0.125, imageLength: 11.5 },
    exText: (o) => `Example: a 0.067 in plate on a 96-tooth (12 in repeat) cylinder has a distortion factor of ${o.distortionFactorPercent}%, so an 11.5 in design is made ${o.artworkLengthIn} in long on the plate.`,
    how: "Enter the total plate thickness (photopolymer plus backing) and the repeat. Apply the factor only in the around-the-cylinder direction.",
    assume: "K = 2π × plate thickness; distortion % = (repeat − K) ÷ repeat × 100. Some trade shops use thickness minus backing film — check your plate supplier.",
    faq: [["Why do flexo plates need distortion?", "Wrapping a plate around a cylinder stretches its surface, so artwork is shortened to print at the right size."]],
  }),
  mk({
    slug: "book-cover-spine-calculator", title: "Book Cover & Spine Width Calculator (IngramSpark-Style)",
    desc: "Calculate a print book's spine width and full cover dimensions with bleed — paperback or case-laminate hardcover — from trim size, page count and paper, with pixel size for artwork.",
    meta: "Ingram Cover Calculator — Spine Width & Cover Size",
    inputs: [num("trimWidth", "Trim Width (in)", 6, 12, 0.01), num("trimHeight", "Trim Height (in)", 9, 14, 0.01), num("pages", "Page Count", 300, 1200, 2, 18), dropdown("paper", "Paper", opts(["White 50# (B&W)", "Cream 50# (B&W)", "Standard color 50#", "Premium color 70#"]), 0), dropdown("binding", "Binding", opts(["Paperback", "Hardcover case laminate"]), 0), num("dpi", "Artwork Resolution (dpi)", 300, 600, 1, 150)],
    results: [["spineWidthIn", "Spine Width (in)", "n"], ["fullCoverWidthIn", "Full Cover Width (in)", "n"], ["fullCoverHeightIn", "Full Cover Height (in)", "n"], ["widthPixels", "Width (pixels)", "n"], ["heightPixels", "Height (pixels)", "n"], ["spineTextAllowed", "Spine Wide Enough for Text (1 = yes)", "n"]],
    fn: E.ingramCover, ex: { trimWidth: 6, trimHeight: 9, pages: 300, paper: 0, binding: 0, dpi: 300 },
    exText: (o) => `Example: a 6 × 9 in paperback with 300 pages on white paper has a ${o.spineWidthIn} in spine and a full cover of ${o.fullCoverWidthIn} × ${o.fullCoverHeightIn} in with bleed.`,
    how: "Enter trim size, page count and paper. Always download the printer's official template before final art — this is a planning tool and not affiliated with IngramSpark.",
    assume: "Spine ≈ pages × paper caliper (white ~0.00225 in/page, cream ~0.0025). Paperback bleed 0.125 in; hardcover adds about 0.75 in wrap and hinge allowances.",
    faq: [["How do I calculate book spine width?", "Multiply page count by the paper's thickness per page — about 0.0023 in for white 50# paper."]],
  }),
  mk({
    slug: "ingramspark-price-calculator", title: "IngramSpark Price & Compensation Calculator",
    desc: "Work out publisher compensation per book through print-on-demand distribution — list price, wholesale discount, print cost per page — versus a KDP-style royalty, with break-even price.",
    meta: "IngramSpark Price Calculator — Compensation per Book",
    inputs: [cur("listPrice", "List Price", 16.99, 500, 0.01), pct("discount", "Wholesale Discount", 55, 70, 1), num("pages", "Page Count", 300, 1200, 2, 18), cur("fixedPrintCost", "Print Cost — Fixed per Book", 1, 20, 0.01), cur("perPageCost", "Print Cost — per Page", 0.013, 0.2, 0.001), num("unitsPerYear", "Expected Sales per Year", 500, 10000000)],
    results: [["compensationPerBook", "Publisher Compensation per Book", "c"], ["printCost", "Print Cost", "c"], ["wholesalePrice", "Wholesale Price", "c"], ["retailerMargin", "Retailer / Distributor Margin", "c"], ["kdpRoyaltyComparison", "KDP-Style 60% Royalty (comparison)", "c"], ["minimumListPriceToBreakEven", "Break-Even List Price", "c"], ["annualEarnings", "Annual Earnings", "c"]],
    fn: E.ingramPrice, ex: { listPrice: 16.99, discount: 55, pages: 300, fixedPrintCost: 1, perPageCost: 0.013, unitsPerYear: 500 },
    exText: (o) => `Example: a 300-page paperback listed at $16.99 with a 55% discount earns ${usd(o.compensationPerBook)} per copy after a ${usd(o.printCost)} print cost.`,
    how: "Enter your list price, wholesale discount and the print cost from your printer's calculator. Lower discounts (40%) earn more per book but reduce bookstore interest.",
    assume: "Compensation = list × (1 − discount) − print cost. Print costs are illustrative B&W paperback rates; color and hardcover cost more. Independent estimate — not affiliated with IngramSpark or Amazon.",
    faq: [["What discount should I set on IngramSpark?", "55% is standard for bookstore distribution; 40% is common for online-focused titles."]],
  }),
  mk({
    slug: "label-size-calculator", title: "Label Size Calculator",
    desc: "Find the right label size — wrap-around or front-panel width for a bottle or jar from its diameter, with overlap and clearance — or how many labels fit on a sheet.",
    inputs: [dropdown("mode", "Calculate", opts(["Label for a round container", "Labels per sheet"]), 0), num("containerDiameter", "Container Diameter (in)", 3, 24, 0.01), num("panelHeight", "Label Panel Height (in)", 4, 24, 0.01), dropdown("wrap", "Label Type", opts(["Full wrap-around", "Partial (front panel)"]), 0), pct("coveragePercent", "Partial Label Coverage of Circumference", 40, 100, 1), num("overlap", "Wrap Overlap (in)", 0.25, 1, 0.0625), num("clearance", "Clearance Top & Bottom (in)", 0.125, 1, 0.0625), num("sheetWidth", "Sheet Width (in)", 8.5, 20, 0.01), num("sheetHeight", "Sheet Height (in)", 11, 30, 0.01), num("labelWidth", "Label Width (in)", 2.625, 20, 0.001), num("labelHeight", "Label Height (in)", 1, 20, 0.001), num("margin", "Sheet Margin (in)", 0.5, 2, 0.0625), num("gap", "Gap Between Labels (in)", 0.125, 1, 0.0625), num("labelsNeeded", "Labels Needed", 1000, 10000000)],
    results: [["labelWidthIn", "Label Width (in)", "n"], ["labelHeightIn", "Label Height (in)", "n"], ["circumferenceIn", "Container Circumference (in)", "n"], ["labelsPerSheet", "Labels per Sheet", "n"], ["sheetUsePercent", "Sheet Use", "p"], ["sheetsNeeded", "Sheets Needed", "n"]],
    fn: E.labelSize, ex: { mode: 0, containerDiameter: 3, panelHeight: 4, wrap: 0, coveragePercent: 40, overlap: 0.25, clearance: 0.125, sheetWidth: 8.5, sheetHeight: 11, labelWidth: 2.625, labelHeight: 1, margin: 0.5, gap: 0.125, labelsNeeded: 1000 },
    exText: (o) => `Example: a full wrap label for a 3 in jar with a 4 in panel should be about ${o.labelWidthIn} × ${o.labelHeightIn} in.`,
    how: "For containers, measure the diameter and the flat label panel height. For sheets, enter the sheet and label sizes.",
    assume: "Wrap length = π × diameter + overlap. Tapered containers need a curved (conical) label template.",
    faq: [["How do I measure a bottle for a label?", "Measure the diameter of the label panel and multiply by 3.14 for the circumference; measure the flat height between shoulders."]],
  }),
  mk({
    slug: "industrial-paint-calculator", title: "Industrial Paint & Coating Calculator",
    desc: "Calculate gallons of industrial coating from area, dry film thickness, volume solids, transfer efficiency and coats — with wet film thickness, coverage and cost.",
    inputs: [num("area", "Surface Area (sq ft)", 5000, 100000000, 1), num("dftMils", "Dry Film Thickness per Coat (mils)", 5, 100, 0.1), pct("volumeSolids", "Volume Solids", 60, 100, 1), dropdown("transferEfficiency", "Application Method", [["Airless spray (65%)", 65], ["Conventional air spray (40%)", 40], ["HVLP (70%)", 70], ["Electrostatic (85%)", 85], ["Brush / roller (90%)", 90]], 65), num("coats", "Coats", 1, 10, 1, 1), pct("thinnerPercent", "Thinner Added", 0, 30, 1), cur("pricePerGal", "Price per Gallon", 85, 1000, 0.5)],
    results: [["gallonsNeeded", "Gallons Needed", "n"], ["gallonsWithThinner", "Gallons incl. Thinner", "n"], ["wetFilmThicknessMils", "Wet Film Thickness (mils)", "n"], ["theoreticalCoverageSqFtPerGal", "Theoretical Coverage (sq ft/gal)", "n"], ["practicalCoverageSqFtPerGal", "Practical Coverage (sq ft/gal)", "n"], ["totalCost", "Coating Cost", "c"]],
    fn: E.industrialPaint, ex: { area: 5000, dftMils: 5, volumeSolids: 60, transferEfficiency: 65, coats: 1, thinnerPercent: 0, pricePerGal: 85 },
    exText: (o) => `Example: 5,000 sq ft at 5 mils DFT with a 60% solids epoxy sprayed airless needs about ${o.gallonsNeeded} gallons (wet film ${o.wetFilmThicknessMils} mils).`,
    how: "Take volume solids and recommended DFT from the product data sheet, choose the application method and enter the area.",
    assume: "Theoretical coverage = 1,604 × volume solids ÷ DFT; practical = theoretical × transfer efficiency. Rough or complex steel loses more.",
    faq: [["How do you calculate paint coverage?", "1,604 × percent volume solids ÷ dry film thickness in mils gives sq ft per gallon before losses."]],
  }),
  mk({
    slug: "milling-speed-feed-calculator", title: "Milling Speed & Feed Calculator",
    desc: "Calculate end mill spindle speed (RPM), feed rate (IPM), material removal rate and spindle horsepower from material, tool, diameter, flutes and chip load (IPT).",
    meta: "Milling Feed Rate Calculator — RPM, IPM & Chip Load",
    inputs: [dropdown("material", "Workpiece Material", opts(E.MILL_MATERIALS.map(([n]) => n)), 2), dropdown("tool", "Tool Material", opts(["Carbide", "HSS"]), 0), num("sfmOverride", "Surface Speed SFM (0 = recommended)", 0, 3000, 5), num("diameter", "Cutter Diameter (in)", 0.5, 6, 0.001), num("flutes", "Flutes", 4, 12, 1, 1), num("chipLoad", "Chip Load per Tooth — IPT (in)", 0.002, 0.03, 0.0001), num("radialDepth", "Radial Width of Cut (in)", 0.25, 6, 0.001), num("axialDepth", "Axial Depth of Cut (in)", 0.5, 6, 0.001), num("maxRpm", "Machine Max RPM (0 = no limit)", 10000, 60000, 100)],
    results: [["spindleRpm", "Spindle Speed (RPM)", "n"], ["feedRateIpm", "Feed Rate (IPM)", "n"], ["feedMmPerMin", "Feed Rate (mm/min)", "n"], ["surfaceSpeedSfm", "Surface Speed (SFM)", "n"], ["materialRemovalRate", "Material Removal Rate (in³/min)", "n"], ["spindleHp", "Spindle Horsepower", "n"], ["rpmLimited", "RPM Limited by Machine (1 = yes)", "n"]],
    fn: E.milling, ex: { material: 2, tool: 0, sfmOverride: 0, diameter: 0.5, flutes: 4, chipLoad: 0.002, radialDepth: 0.25, axialDepth: 0.5, maxRpm: 10000 },
    exText: (o) => `Example: a 1/2 in 4-flute carbide end mill in 1018 steel runs at ${fmt(o.spindleRpm, 0)} RPM and ${o.feedRateIpm} IPM at 0.002 in per tooth, removing ${o.materialRemovalRate} in³/min (~${o.spindleHp} hp).`,
    how: "Choose workpiece and tool materials, enter the cutter size, flutes and chip load from the tool maker's chart, and your depths of cut.",
    assume: "RPM = SFM × 12 ÷ (π D); IPM = RPM × flutes × IPT; hp = MRR × unit power. Starting SFM values are conservative averages — tool makers' data and chip thinning adjustments come first.",
    faq: [["What is IPT in machining?", "Inches per tooth — the chip load each cutting edge takes per revolution."]],
  }),
  mk({
    slug: "welding-calculator", title: "Welding Rod & Filler Metal Calculator",
    desc: "Estimate filler metal for fillet or groove welds — weld metal per foot, deposited and filler pounds by process efficiency, stick electrode count, arc time, labor hours and cost.",
    meta: "Welding Rod Calculator — Electrodes & Filler Needed",
    inputs: [dropdown("joint", "Joint", opts(["Fillet weld", "Groove weld (enter area)"]), 0), num("legSize", "Fillet Leg Size (in)", 0.25, 2, 0.0625), num("grooveArea", "Groove Cross-Section (sq in)", 0.2, 10, 0.001), num("length", "Total Weld Length (ft)", 100, 100000, 0.5), pct("reinforcement", "Reinforcement Allowance", 10, 50, 1), dropdown("process", "Process", opts(E.WELD_PROCESS.map(([n, e]) => `${n} (${Math.round(e * 100)}% efficiency)`)), 0), num("rodsPerLb", "Stick Electrodes per lb (1/8 in × 14 in ≈ 18)", 18, 60, 1, 1), pct("operatorFactor", "Operator Factor (arc-on time)", 30, 100, 1), cur("fillerPricePerLb", "Filler Price per lb", 4.5, 100, 0.05), cur("laborRate", "Welder Labor Rate per Hour", 65, 300, 0.5)],
    results: [["fillerMetalLb", "Filler Metal to Buy (lb)", "n"], ["electrodesNeeded", "Stick Electrodes Needed", "n"], ["depositedMetalLb", "Deposited Weld Metal (lb)", "n"], ["weldMetalLbPerFt", "Weld Metal per Foot (lb)", "n"], ["arcTimeHours", "Arc Time (h)", "n"], ["laborHours", "Labor Hours", "n"], ["totalCost", "Filler + Labor Cost", "c"]],
    fn: E.welding, ex: { joint: 0, legSize: 0.25, grooveArea: 0.2, length: 100, reinforcement: 10, process: 0, rodsPerLb: 18, operatorFactor: 30, fillerPricePerLb: 4.5, laborRate: 65 },
    exText: (o) => `Example: 100 ft of 1/4 in fillet weld deposits ${o.depositedMetalLb} lb of metal; by stick that's ${o.fillerMetalLb} lb of electrode (about ${o.electrodesNeeded} rods of 1/8 in).`,
    how: "Choose the joint, size and total length, the process and your shop's operator factor.",
    assume: "Fillet area = leg² ÷ 2; steel 0.2836 lb/in³. Deposition efficiency: SMAW 65% (stubs, spatter, slag), GMAW 95%, FCAW 85%, GTAW 98%, SAW 99%.",
    faq: [["How many welding rods do I need?", "About 0.13 lb of weld metal per foot of 1/4 in fillet — roughly 3–4 rods of 1/8 in E7018 per foot."]],
  }),
  mk({
    slug: "injection-molding-cost-calculator", title: "Plastic Injection Molding Cost Calculator",
    desc: "Estimate injection molded part cost — resin, machine time by cycle and cavities, mold amortization, secondary operations and packaging — plus clamp tonnage and production hours.",
    meta: "Plastic Injection Molding Cost Calculator — Cost per Part",
    inputs: [num("quantity", "Production Quantity", 10000, 100000000, 1), cur("moldCost", "Mold Cost", 15000, 10000000, 100), num("cavities", "Cavities", 2, 128, 1, 1), num("partWeightG", "Part Weight (g, incl. runner share)", 40, 100000, 0.1), cur("resinPerKg", "Resin Price per kg", 2.5, 100, 0.05), num("cycleSeconds", "Cycle Time (s)", 30, 600, 0.5), cur("machineRate", "Machine Rate per Hour (incl. labor)", 65, 1000, 0.5), pct("scrap", "Scrap Rate", 3, 50, 0.5), cur("secondaryPerPart", "Secondary Ops per Part", 0.05, 100, 0.01), cur("packagingPerPart", "Packaging per Part", 0.03, 100, 0.01), num("projectedArea", "Projected Area per Cavity (sq in)", 10, 1000, 0.1), num("tonsPerSqIn", "Clamp Factor (tons per sq in)", 3, 8, 0.1, 1)],
    results: [["costPerPart", "Cost per Part", "c"], ["totalCost", "Total Cost", "c"], ["materialPerPart", "Material per Part", "c"], ["machinePerPart", "Machine Time per Part", "c"], ["moldAmortizationPerPart", "Mold Amortization per Part", "c"], ["clampTonnage", "Required Clamp Tonnage", "n"], ["partsPerHour", "Parts per Hour", "n"], ["productionHours", "Production Hours", "n"]],
    fn: E.injectionMolding, ex: { quantity: 10000, moldCost: 15000, cavities: 2, partWeightG: 40, resinPerKg: 2.5, cycleSeconds: 30, machineRate: 65, scrap: 3, secondaryPerPart: 0.05, packagingPerPart: 0.03, projectedArea: 10, tonsPerSqIn: 3 },
    exText: (o) => `Example: 10,000 parts of 40 g from a $15,000 two-cavity mold on a 30 s cycle cost about ${usd(o.costPerPart)} each — ${usd(o.moldAmortizationPerPart)} of that is the mold — on a ${o.clampTonnage}-ton press.`,
    how: "Enter volume, mold quote, cavities, part weight and cycle time from your molder, and your resin price.",
    assume: "Machine time = cycle ÷ cavities × rate; mold cost spread over the quantity; clamp tonnage = projected area × cavities × 2–5 tons/in² (3 typical).",
    faq: [["How much does injection molding cost per part?", "Often $0.10–5 per part at volume; the mold ($5,000–100,000+) dominates at low quantities."]],
  }),
  mk({
    slug: "sublimation-calculator", title: "Sublimation Pricing Calculator",
    desc: "Price sublimation products — blank, transfer paper, ink by print area, press time and labor, overhead and markup — with profit, margin and order total.",
    inputs: [cur("blankCost", "Blank Cost (shirt, mug, tumbler…)", 4.5, 500, 0.05), cur("paperCost", "Sublimation Paper per Sheet", 0.35, 10, 0.01), num("printArea", "Print Area (sq in)", 80, 2000, 1), cur("inkPerSqIn", "Ink Cost per sq in", 0.01, 1, 0.001), num("minutesPerItem", "Minutes per Item (print, press, finish)", 6, 120, 0.5), cur("laborRate", "Labor Rate per Hour", 20, 200, 0.5), cur("overheadPerItem", "Overhead per Item (tape, power, wear)", 0.4, 50, 0.05), pct("markup", "Markup on Cost", 150, 1000, 5), num("quantity", "Order Quantity", 24, 100000, 1, 1), cur("setupFee", "Setup / Design Fee", 25, 1000, 1)],
    results: [["pricePerItem", "Price per Item", "c"], ["costPerItem", "Cost per Item", "c"], ["profitPerItem", "Profit per Item", "c"], ["marginPercent", "Profit Margin", "p"], ["inkCost", "Ink Cost per Item", "c"], ["orderTotal", "Order Total", "c"], ["productionHours", "Production Hours", "n"]],
    fn: E.sublimation, ex: { blankCost: 4.5, paperCost: 0.35, printArea: 80, inkPerSqIn: 0.01, minutesPerItem: 6, laborRate: 20, overheadPerItem: 0.4, markup: 150, quantity: 24, setupFee: 25 },
    exText: (o) => `Example: a $4.50 mug blank with ink, paper, 6 minutes of labor and overhead costs ${usd(o.costPerItem)}; a 150% markup prices it at ${usd(o.pricePerItem)} (${o.marginPercent}% margin).`,
    how: "Enter blank and consumable costs, how long each item takes and your markup.",
    assume: "Sublimation ink typically costs $0.005–0.02 per sq in of coverage. Price = cost × (1 + markup).",
    faq: [["How much should I charge for sublimation?", "Many shops price at 2–3× total cost — e.g. $12–18 for an 11 oz mug."]],
  }),
  mk({
    slug: "laser-waterjet-cutting-cost-calculator", title: "Laser & Waterjet Cutting Cost Calculator",
    desc: "Estimate part cost for fiber laser, abrasive waterjet or plasma cutting — cut speed by material and thickness, cut length and pierces, machine rate, material and setup.",
    meta: "Waterjet & Laser Cutting Cost Calculator — Price per Part",
    inputs: [dropdown("method", "Cutting Method", opts(E.CUT_METHODS.map(([n]) => n)), 0), dropdown("material", "Material", opts(["Mild steel", "Stainless steel", "Aluminum"]), 0), num("thickness", "Thickness (in)", 0.25, 8, 0.01), num("speedOverride", "Cut Speed IPM (0 = estimate)", 0, 2000, 0.1), num("cutLength", "Cut Length per Part (in)", 60, 100000, 0.1), num("pierces", "Pierces per Part", 4, 10000), num("pierceSeconds", "Seconds per Pierce (0 = default)", 0, 120, 0.5), cur("machineRate", "Machine Rate per Hour", 150, 1000, 1), cur("materialPerPart", "Material per Part", 6, 10000, 0.1), cur("setup", "Setup / Programming (per job)", 75, 10000, 1), num("quantity", "Quantity", 25, 1000000, 1, 1)],
    results: [["costPerPart", "Cost per Part", "c"], ["totalCost", "Job Total", "c"], ["cutSpeedIpm", "Cut Speed (IPM)", "n"], ["machineMinutesPerPart", "Machine Minutes per Part", "n"], ["machineCostPerPart", "Machine Cost per Part", "c"], ["totalMachineHours", "Total Machine Hours", "n"]],
    fn: E.cuttingCost, ex: { method: 0, material: 0, thickness: 0.25, speedOverride: 0, cutLength: 60, pierces: 4, pierceSeconds: 0, machineRate: 150, materialPerPart: 6, setup: 75, quantity: 25 },
    exText: (o) => `Example: a part with 60 in of cut and 4 pierces in 1/4 in steel on a fiber laser (~${o.cutSpeedIpm} IPM) takes ${o.machineMinutesPerPart} minutes — about ${usd(o.costPerPart)} each for 25 pieces.`,
    how: "Choose the process, material and thickness, then the part's total cut length and pierce count from your CAD file.",
    assume: "Cut speeds are rough parametric estimates for typical 2026 machines (laser 4–6 kW, 60k psi waterjet, HD plasma); use your machine's cut chart for quoting. Typical machine rates: laser $100–200/h, waterjet $100–175/h, plasma $75–150/h.",
    faq: [["Is waterjet or laser cheaper?", "Laser is usually faster and cheaper in sheet up to ~1/2 in; waterjet wins for thick plate, heat-sensitive or non-metal materials."]],
  }),
  mk({
    slug: "urethane-casting-cost-calculator", title: "Urethane Casting Cost Calculator",
    desc: "Estimate urethane (vacuum) casting cost — master pattern, silicone molds by mold life, resin by part volume, labor, finishing — per part and total.",
    inputs: [num("quantity", "Quantity", 50, 100000, 1, 1), cur("masterCost", "Master Pattern (SLA / CNC)", 350, 100000, 5), cur("moldCost", "Silicone Mold Cost (each)", 650, 100000, 5), num("partsPerMold", "Parts per Mold (mold life)", 20, 100, 1, 1), num("partVolume", "Part Volume (in³)", 6, 10000, 0.1), num("density", "Resin Density (g/cm³)", 1.1, 2, 0.01, 0.8), pct("waste", "Resin Waste (sprues, vents)", 15, 100, 1), cur("resinPerLb", "Resin Price per lb", 18, 200, 0.5), num("minutesPerPart", "Labor Minutes per Part", 30, 600, 1), cur("laborRate", "Labor Rate per Hour", 55, 300, 0.5), cur("finishingPerPart", "Finishing / Paint per Part", 8, 1000, 0.5)],
    results: [["costPerPart", "Cost per Part", "c"], ["totalCost", "Total Cost", "c"], ["toolingCost", "Tooling (master + molds)", "c"], ["moldsNeeded", "Molds Needed", "n"], ["resinPerPartLb", "Resin per Part (lb)", "n"], ["materialPerPart", "Material per Part", "c"], ["laborPerPart", "Labor per Part", "c"]],
    fn: E.urethaneCasting, ex: { quantity: 50, masterCost: 350, moldCost: 650, partsPerMold: 20, partVolume: 6, density: 1.1, waste: 15, resinPerLb: 18, minutesPerPart: 30, laborRate: 55, finishingPerPart: 8 },
    exText: (o) => `Example: 50 parts of 6 in³ need ${o.moldsNeeded} silicone molds; with labor and finishing each part costs about ${usd(o.costPerPart)} (${usd(o.totalCost)} total).`,
    how: "Enter the quantity, tooling quotes, mold life, part volume and your resin and labor rates.",
    assume: "Silicone molds typically yield 15–25 parts. Best for 10–500 parts before injection molding becomes cheaper.",
    faq: [["When is urethane casting cheaper than injection molding?", "Usually below a few hundred parts, because the tooling costs a fraction of a steel mold."]],
  }),
  mk({
    slug: "oee-calculator", title: "OEE Calculator (Overall Equipment Effectiveness)",
    desc: "Calculate OEE from availability, performance and quality — shift time, planned and unplanned downtime, ideal cycle time, total and good count — with lost units.",
    inputs: [num("shiftMinutes", "Shift Length (min)", 480, 1440, 1), num("plannedDowntime", "Planned Stops — breaks, meetings (min)", 30, 1440, 1), num("unplannedDowntime", "Unplanned Downtime (min)", 47, 1440, 1), num("idealCycleSeconds", "Ideal Cycle Time (s per part)", 1, 3600, 0.01), num("totalCount", "Total Parts Produced", 19271, 10000000), num("goodCount", "Good Parts", 18848, 10000000)],
    results: [["oeePercent", "OEE", "p"], ["availabilityPercent", "Availability", "p"], ["performancePercent", "Performance", "p"], ["qualityPercent", "Quality", "p"], ["idealOutput", "Ideal Output in Planned Time", "n"], ["lostUnits", "Units Lost to Losses", "n"], ["runTimeMinutes", "Run Time (min)", "n"]],
    fn: E.oee, ex: { shiftMinutes: 480, plannedDowntime: 30, unplannedDowntime: 47, idealCycleSeconds: 1, totalCount: 19271, goodCount: 18848 },
    exText: (o) => `Example: an 8-hour shift with 30 min of breaks, 47 min down and 18,848 good parts out of 19,271 at a 1 s ideal cycle has ${o.availabilityPercent}% availability, ${o.performancePercent}% performance and ${o.qualityPercent}% quality — OEE ${o.oeePercent}%.`,
    how: "Enter shift and stop times, the ideal (nameplate) cycle time and the counts from the shift.",
    assume: "OEE = Availability × Performance × Quality (Nakajima). World-class OEE is often cited as 85%; typical discrete plants run 40–60%.",
    faq: [["What is a good OEE score?", "85% is considered world class; 60% is typical and 40% is common for plants just starting to measure."]],
  }),
  mk({
    slug: "manufacturing-cost-calculator", title: "Manufacturing Cost Calculator",
    desc: "Calculate total manufacturing cost and cost of goods manufactured — direct materials, direct labor, overhead (as % of labor or a total), WIP changes — with cost per unit and a suggested price.",
    inputs: [cur("directMaterials", "Direct Materials", 42000, 1000000000, 10), num("laborHours", "Direct Labor Hours", 1200, 10000000, 1), cur("laborRate", "Direct Labor Rate per Hour", 28, 500, 0.25), dropdown("overheadBasis", "Overhead Entered As", opts(["% of direct labor", "Total amount"]), 0), pct("overheadRate", "Overhead Rate (% of labor)", 150, 1000, 1), cur("overheadAmount", "Overhead Amount", 50000, 1000000000, 10), cur("beginningWip", "Beginning WIP", 0, 1000000000, 10), cur("endingWip", "Ending WIP", 0, 1000000000, 10), num("units", "Units Completed", 5000, 1000000000), pct("markup", "Markup for Price", 35, 500, 1)],
    results: [["costPerUnit", "Cost per Unit", "c"], ["costOfGoodsManufactured", "Cost of Goods Manufactured", "c"], ["totalManufacturingCost", "Total Manufacturing Cost", "c"], ["directLabor", "Direct Labor", "c"], ["manufacturingOverhead", "Manufacturing Overhead", "c"], ["primeCost", "Prime Cost (DM + DL)", "c"], ["conversionCost", "Conversion Cost (DL + OH)", "c"], ["suggestedPrice", "Suggested Price per Unit", "c"]],
    fn: E.mfgCost, ex: { directMaterials: 42000, laborHours: 1200, laborRate: 28, overheadBasis: 0, overheadRate: 150, overheadAmount: 50000, beginningWip: 0, endingWip: 0, units: 5000, markup: 35 },
    exText: (o) => `Example: $42,000 of materials, 1,200 labor hours at $28 and overhead at 150% of labor make 5,000 units at ${usd(o.costPerUnit)} each; a 35% markup gives ${usd(o.suggestedPrice)}.`,
    how: "Enter the period's direct costs, how you apply overhead and the units completed.",
    assume: "COGM = DM + DL + MOH + beginning WIP − ending WIP. Overhead absorption on labor is common; use machine hours if your plant is automated.",
    faq: [["How do you calculate manufacturing cost per unit?", "Add materials, labor and overhead for the period and divide by units completed."]],
  }),
  mk({
    slug: "takt-time-calculator", title: "Takt Time Calculator",
    desc: "Calculate takt time from available production time and customer demand — seconds per unit, operators needed for the work content, and whether your cycle time keeps up.",
    inputs: [num("shiftMinutes", "Shift Length (min)", 480, 1440, 1), num("breakMinutes", "Breaks & Planned Stops (min)", 30, 1440, 1), num("shifts", "Shifts per Day", 2, 3, 1, 1), num("dailyDemand", "Customer Demand per Day (units)", 900, 10000000), num("cycleTimeSeconds", "Current Cycle Time (s)", 55, 100000, 0.1), num("workContentSeconds", "Total Work Content per Unit (s)", 240, 1000000, 1)],
    results: [["taktTimeSeconds", "Takt Time (s per unit)", "n"], ["taktTimeMinutes", "Takt Time (min per unit)", "n"], ["operatorsNeeded", "Operators Needed", "n"], ["theoreticalOperators", "Theoretical Operators", "n"], ["cycleTimeMeetsTakt", "Cycle Time ≤ Takt (1 = yes)", "n"], ["maxOutputAtCycleTime", "Max Output at Current Cycle Time", "n"], ["availableSecondsPerDay", "Available Seconds per Day", "n"]],
    fn: E.taktTime, ex: { shiftMinutes: 480, breakMinutes: 30, shifts: 2, dailyDemand: 900, cycleTimeSeconds: 55, workContentSeconds: 240 },
    exText: (o) => `Example: two 8-hour shifts (450 working minutes each) meeting demand of 900 a day give a takt of ${o.taktTimeSeconds} s; 240 s of work content needs ${o.operatorsNeeded} operators.`,
    how: "Enter the time you actually run and the daily customer demand, then the work content of one unit.",
    assume: "Takt = available time ÷ demand; operators = work content ÷ takt (rounded up).",
    faq: [["What's the difference between takt time and cycle time?", "Takt is the pace customers require; cycle time is how fast you actually produce. Cycle time must be at or below takt."]],
  }),
  mk({
    slug: "ansi-z14-sampling-calculator", title: "ANSI/ASQ Z1.4 Sampling Plan Calculator (AQL)",
    desc: "Find the ANSI/ASQ Z1.4 single sampling plan — code letter, sample size, accept and reject numbers — for your lot size, inspection level and AQL, and whether a lot passes.",
    meta: "ANSI ASQ Z1.4 Calculator — AQL Sample Size & Accept Number",
    inputs: [num("lotSize", "Lot Size", 500, 10000000, 1, 2), dropdown("level", "General Inspection Level", opts(["I (reduced discrimination)", "II (normal default)", "III (more discrimination)"]), 1), dropdown("aql", "AQL", opts(E.Z14_AQLS.map((a) => `${a}%`)), 5), num("defectsFound", "Defects Found in Sample", 0, 10000)],
    results: [["sampleSize", "Sample Size (n)", "n"], ["acceptNumber", "Accept if Defects ≤ (Ac)", "n"], ["rejectNumber", "Reject if Defects ≥ (Re)", "n"], ["codeLetterIndex", "Code Letter (1 = A … 16 = R)", "n"], ["sampleShareOfLotPercent", "Sample as % of Lot", "p"], ["accept", "Lot Accepted (1 = yes)", "n"]],
    fn: E.z14, ex: { lotSize: 500, level: 1, aql: 5, defectsFound: 0 },
    exText: (o) => `Example: a lot of 500 at general level II and AQL 2.5 uses code letter H — inspect ${o.sampleSize} pieces, accept with ${o.acceptNumber} or fewer defects, reject at ${o.rejectNumber}.`,
    how: "Enter the lot size, inspection level (II unless your contract says otherwise) and the AQL, then the defects you found.",
    assume: "Normal inspection, single sampling, Table I and Table II-A of ANSI/ASQ Z1.4-2003 (R2018) for AQLs 0.25–6.5%; arrows in the table are followed to the next plan, which changes the sample size. Switching rules (tightened/reduced) are not applied. Letters skip I and O (A–H, J–N, P–R).",
    faq: [["What is AQL 2.5?", "The worst average defect rate (2.5%) considered acceptable as a process average under the sampling plan."]],
  }),
  mk({
    slug: "availability-calculator", title: "Availability Calculator (Uptime & Nines)",
    desc: "Calculate equipment or system availability from MTBF and MTTR or uptime and downtime — percent availability, downtime per year and month, and number of nines.",
    inputs: [dropdown("mode", "Calculate From", opts(["MTBF and MTTR", "Uptime and downtime hours"]), 0), num("mtbf", "MTBF (hours)", 500, 10000000, 1), num("mttr", "MTTR (hours)", 4, 100000, 0.1), num("uptimeHours", "Uptime (hours)", 8700, 10000000, 1), num("downtimeHours", "Downtime (hours)", 60, 1000000, 0.1)],
    results: [["availabilityPercent", "Availability (%)", "n"], ["downtimeHoursPerYear", "Downtime per Year (h)", "n"], ["downtimeMinutesPerMonth", "Downtime per Month (min)", "n"], ["numberOfNines", "Number of Nines", "n"], ["unavailabilityPercent", "Unavailability (%)", "n"]],
    fn: E.availability, ex: { mode: 0, mtbf: 500, mttr: 4, uptimeHours: 8700, downtimeHours: 60 },
    exText: (o) => `Example: MTBF 500 h and MTTR 4 h give ${o.availabilityPercent}% availability — about ${o.downtimeHoursPerYear} hours of downtime a year.`,
    how: "Enter MTBF and MTTR from maintenance records, or total up and down hours for a period.",
    assume: "Inherent availability A = MTBF ÷ (MTBF + MTTR); 99.9% ('three nines') ≈ 8.8 h of downtime a year.",
    faq: [["How do you calculate availability?", "Availability = uptime ÷ (uptime + downtime), or MTBF ÷ (MTBF + MTTR)."]],
  }),
  mk({
    slug: "timing-belt-calculator", title: "Timing Belt Length & Center Distance Calculator",
    desc: "Calculate timing belt length and tooth count from pulley teeth, pitch (GT2, HTD, XL, L) and center distance — then the exact center for a stock belt, ratio and teeth in mesh.",
    meta: "Timing Belt Calculator — Belt Length & Center Distance (WCP-Style)",
    inputs: [dropdown("pitch", "Belt Pitch", opts(E.BELT_PITCH.map(([n]) => n)), 2), num("teeth1", "Driver Pulley Teeth", 24, 300, 1, 8), num("teeth2", "Driven Pulley Teeth", 36, 300, 1, 8), dropdown("units", "Center Distance Units", opts(["Millimeters", "Inches"]), 1), num("centerDistance", "Approximate Center Distance", 6, 5000, 0.01)],
    results: [["beltTeeth", "Belt Teeth (nearest)", "n"], ["beltLength", "Belt Length at This Center", "n"], ["centerForWholeBelt", "Exact Center for That Belt", "n"], ["speedRatio", "Speed Ratio", "n"], ["smallPulleyWrapDegrees", "Wrap on Small Pulley (°)", "n"], ["teethInMeshSmall", "Teeth in Mesh (small pulley)", "n"], ["pitchDiameter1", "Driver Pitch Diameter", "n"], ["pitchDiameter2", "Driven Pitch Diameter", "n"]],
    fn: E.timingBelt, ex: { pitch: 2, teeth1: 24, teeth2: 36, units: 1, centerDistance: 6 },
    exText: (o) => `Example: 24T and 36T HTD 5M pulleys about 6 in apart need a ${o.beltTeeth}-tooth belt; set the centers to ${o.centerForWholeBelt} in for that belt (ratio ${o.speedRatio}:1).`,
    how: "Choose the belt pitch, enter both pulley tooth counts and your target center distance. Lengths are in the units you chose.",
    assume: "Belt length = 2C + π(D1 + D2)/2 + (D2 − D1)²/4C with pitch diameters D = teeth × pitch ÷ π; exact center solved for a whole-tooth belt. Keep at least 6 teeth in mesh.",
    faq: [["How do I calculate timing belt length?", "Use the pulley pitch diameters and center distance in the open-belt length formula, then round to whole teeth."]],
  }),
  mk({
    slug: "equipment-roi-calculator", title: "Equipment ROI Calculator",
    desc: "Calculate the return on new production or drying equipment — labor, energy, scrap and extra-profit savings against purchase, installation and operating cost — with payback, ROI and NPV.",
    inputs: [cur("equipmentCost", "Equipment Cost", 150000, 1000000000, 100), cur("installation", "Installation & Integration", 15000, 100000000, 100), cur("training", "Training & Startup", 5000, 10000000, 100), num("laborHoursSaved", "Labor Hours Saved per Year", 2000, 1000000, 1), cur("laborRate", "Loaded Labor Rate per Hour", 32, 500, 0.5), cur("energySavings", "Energy Savings per Year", 6000, 100000000, 10), cur("scrapSavings", "Scrap / Rework Savings per Year", 10000, 100000000, 10), cur("extraProfit", "Profit from Extra Capacity per Year", 15000, 100000000, 10), cur("annualOperatingCost", "Added Operating & Maintenance Cost per Year", 8000, 100000000, 10), num("lifeYears", "Useful Life (years)", 10, 50, 1, 1), cur("salvage", "Salvage Value", 10000, 100000000, 100), pct("discountRate", "Discount Rate", 8, 30, 0.25)],
    results: [["paybackYears", "Payback (years)", "n"], ["roiPercent", "Lifetime ROI", "p"], ["npv", "Net Present Value", "c"], ["annualNetSavings", "Annual Net Savings", "c"], ["totalInvestment", "Total Investment", "c"], ["lifetimeNetGain", "Lifetime Net Gain", "c"]],
    fn: E.equipmentRoi, ex: { equipmentCost: 150000, installation: 15000, training: 5000, laborHoursSaved: 2000, laborRate: 32, energySavings: 6000, scrapSavings: 10000, extraProfit: 15000, annualOperatingCost: 8000, lifeYears: 10, salvage: 10000, discountRate: 8 },
    exText: (o) => `Example: a $170,000 investment saving ${usd(o.annualNetSavings)} a year pays back in ${o.paybackYears} years with an NPV of ${usd(o.npv)} at 8%.`,
    how: "Enter the full installed cost and realistic annual savings. Include added maintenance and operating costs.",
    assume: "Savings assumed level each year; taxes and depreciation are not included (Section 179 / bonus depreciation can improve after-tax payback).",
    faq: [["What is a good payback for equipment?", "Many manufacturers target 2–3 years for productivity equipment."]],
  }),
  mk({
    slug: "accelerated-aging-calculator", title: "Accelerated Aging & Stability Calculator",
    desc: "Calculate the acceleration factor and equivalent real-time age for accelerated aging and stability studies — ASTM F1980 Q10 method or Arrhenius activation energy.",
    meta: "Accelerated Stability Calculator — Q10 & Arrhenius Aging Time",
    inputs: [dropdown("method", "Method", opts(["Q10 rule (ASTM F1980)", "Arrhenius (activation energy)"]), 0), num("q10", "Q10 Factor", 2, 5, 0.1, 1), num("activationEnergy", "Activation Energy (kJ/mol)", 83, 300, 0.5, 10), num("accelTemp", "Accelerated Aging Temperature (°C)", 55, 120, 0.5, 0), num("useTemp", "Real-Time Storage Temperature (°C)", 25, 60, 0.5, -20), num("testDays", "Days at Accelerated Temperature", 46, 3650, 0.5), num("targetShelfMonths", "Target Shelf Life (months)", 24, 240, 1)],
    results: [["accelerationFactor", "Acceleration Factor", "n"], ["equivalentRealDays", "Equivalent Real Time (days)", "n"], ["equivalentRealMonths", "Equivalent Real Time (months)", "n"], ["equivalentRealYears", "Equivalent Real Time (years)", "n"], ["testDaysForTarget", "Test Days Needed for Target", "n"]],
    fn: E.acceleratedAging, ex: { method: 0, q10: 2, activationEnergy: 83, accelTemp: 55, useTemp: 25, testDays: 46, targetShelfMonths: 24 },
    exText: (o) => `Example: at 55 °C with Q10 = 2 the acceleration factor is ${o.accelerationFactor}, so 46 days of aging equals about ${o.equivalentRealMonths} months at 25 °C; a 2-year claim needs ${o.testDaysForTarget} test days.`,
    how: "Choose Q10 (medical device packaging) or Arrhenius (drug and chemical stability), enter temperatures and test time.",
    assume: "Q10: AF = Q10^((Taa − Trt)/10). Arrhenius: AF = exp[(Ea/R)(1/Tuse − 1/Taccel)] in kelvin. ASTM F1980 recommends Q10 = 2 and aging temperatures ≤ 60 °C; real-time studies must confirm accelerated claims.",
    faq: [["How long is accelerated aging for 1 year?", "About 23 days at 55 °C with Q10 = 2 (AF = 8)."]],
  }),
  mk({
    slug: "die-per-wafer-calculator", title: "Die per Wafer Calculator",
    desc: "Calculate gross die per wafer from wafer diameter, die size, scribe and edge exclusion — then good die with Murphy or Poisson yield and cost per good die.",
    meta: "Die per Wafer Calculator — Gross Die, Yield & Cost (TechInsights-Style)",
    inputs: [dropdown("waferDiameter", "Wafer Diameter", [["300 mm", 300], ["200 mm", 200], ["150 mm", 150], ["450 mm", 450]], 300), num("dieWidth", "Die Width (mm)", 10, 50, 0.01), num("dieHeight", "Die Height (mm)", 10, 50, 0.01), num("scribe", "Scribe Line (mm)", 0.1, 1, 0.01), num("edgeExclusion", "Edge Exclusion (mm)", 3, 10, 0.1), num("defectDensity", "Defect Density (per cm²)", 0.1, 5, 0.01), dropdown("yieldModel", "Yield Model", opts(["Murphy", "Poisson"]), 0), cur("waferCost", "Processed Wafer Cost", 17000, 100000, 50)],
    results: [["grossDiePerWafer", "Gross Die per Wafer", "n"], ["goodDiePerWafer", "Good Die per Wafer", "n"], ["yieldPercent", "Die Yield", "p"], ["costPerGoodDie", "Cost per Good Die", "c"], ["dieAreaMm2", "Die Area (mm²)", "n"], ["poissonYieldPercent", "Poisson Yield (for comparison)", "p"]],
    fn: E.diePerWafer, ex: { waferDiameter: 300, dieWidth: 10, dieHeight: 10, scribe: 0.1, edgeExclusion: 3, defectDensity: 0.1, yieldModel: 0, waferCost: 17000 },
    exText: (o) => `Example: a 10 × 10 mm die on a 300 mm wafer gives ${o.grossDiePerWafer} gross die; at 0.1 defects/cm² about ${o.goodDiePerWafer} are good — ${usd(o.costPerGoodDie)} each on a $17,000 wafer.`,
    how: "Enter the die size, scribe width, wafer size and edge exclusion, plus a defect density for your process maturity.",
    assume: "DPW = π d²/(4S) − π d/√(2S) with d reduced by edge exclusion; Murphy yield ((1 − e^(−DA))/DA)², Poisson e^(−DA). Independent estimate — not affiliated with TechInsights.",
    faq: [["How many chips fit on a 300 mm wafer?", "About 600 at 100 mm² die size, before yield losses."]],
  }),
  mk({
    slug: "sigma-level-calculator", title: "Sigma Level Calculator (DPMO)",
    desc: "Convert defects, units and opportunities into DPMO, process yield and Six Sigma level (with the 1.5σ shift) — or start from DPMO or yield.",
    meta: "Sigma Level Calculator — DPMO to Six Sigma",
    inputs: [dropdown("mode", "Calculate From", opts(["Defects, units, opportunities", "DPMO", "Yield %"]), 0), num("defects", "Defects", 25, 100000000), num("units", "Units", 1000, 1000000000), num("opportunities", "Opportunities per Unit", 10, 100000, 1, 1), num("dpmo", "DPMO", 2500, 999999, 0.1), pct("yieldPercent", "Yield", 99.75, 100, 0.0001)],
    results: [["sigmaLevel", "Sigma Level (short-term)", "n"], ["dpmo", "DPMO", "n"], ["yieldPercent", "Yield (%)", "n"], ["defectRatePercent", "Defect Rate (%)", "n"], ["longTermSigma", "Long-Term Z (no shift)", "n"]],
    fn: E.sigmaLevel, ex: { mode: 0, defects: 25, units: 1000, opportunities: 10, dpmo: 2500, yieldPercent: 99.75 },
    exText: (o) => `Example: 25 defects in 1,000 units with 10 opportunities each is ${fmt(o.dpmo, 0)} DPMO — a ${o.yieldPercent}% yield and a ${o.sigmaLevel} sigma process.`,
    how: "Enter defects, units and defect opportunities per unit — or a known DPMO or yield.",
    assume: "Sigma = Φ⁻¹(yield) + 1.5 (Motorola convention). Six Sigma = 3.4 DPMO.",
    faq: [["What is 6 sigma in DPMO?", "3.4 defects per million opportunities (with the 1.5σ shift)."]],
  }),
  mk({
    slug: "predictive-maintenance-roi-calculator", title: "Predictive Maintenance ROI Calculator",
    desc: "Estimate the ROI of a predictive maintenance (condition monitoring) program — failures avoided, downtime and PM savings versus sensors, software and implementation — with payback.",
    meta: "Predictive Maintenance Calculator — Savings & Payback",
    inputs: [num("assets", "Monitored Assets", 50, 100000), num("failuresPerAsset", "Unplanned Failures per Asset per Year", 0.6, 20, 0.05), cur("costPerFailure", "Cost per Failure (repair + downtime)", 18000, 10000000, 100), pct("failureReduction", "Failures Avoided", 40, 100, 1), cur("annualPmSpend", "Annual Preventive Maintenance Spend", 200000, 1000000000, 100), pct("pmReduction", "PM Spend Reduction", 15, 80, 1), cur("sensorsPerAsset", "Sensors & Gateway per Asset", 1200, 100000, 10), cur("softwarePerAssetYear", "Software per Asset per Year", 400, 100000, 10), cur("implementation", "Implementation / Training", 25000, 10000000, 100)],
    results: [["annualNetSavings", "Annual Net Savings", "c"], ["grossAnnualSavings", "Gross Annual Savings", "c"], ["failuresAvoided", "Failures Avoided per Year", "n"], ["upfrontCost", "Upfront Cost", "c"], ["paybackMonths", "Payback (months)", "n"], ["threeYearRoiPercent", "3-Year ROI", "p"]],
    fn: E.predictiveMaintenance, ex: { assets: 50, failuresPerAsset: 0.6, costPerFailure: 18000, failureReduction: 40, annualPmSpend: 200000, pmReduction: 15, sensorsPerAsset: 1200, softwarePerAssetYear: 400, implementation: 25000 },
    exText: (o) => `Example: monitoring 50 assets that fail 0.6 times a year at $18,000 a failure avoids ${o.failuresAvoided} failures and saves ${usd(o.annualNetSavings)} a year net — payback in ${o.paybackMonths} months.`,
    how: "Use your CMMS history for failure rates and costs, and vendor quotes for sensors and software.",
    assume: "Industry studies typically cite 25–50% fewer breakdowns and 10–25% lower maintenance cost with mature predictive programs.",
    faq: [["Is predictive maintenance worth it?", "For critical rotating equipment with costly downtime, payback within 1–2 years is common."]],
  }),
  mk({
    slug: "mttf-calculator", title: "MTTF Calculator (Mean Time to Failure)",
    desc: "Calculate mean time to failure from test or field data — failure rate, FIT rate, B10 life and reliability over a mission time using the exponential model.",
    inputs: [dropdown("mode", "Data", opts(["Units × hours each", "Total unit-hours"]), 0), num("units", "Units on Test / in Field", 100, 100000000), num("hoursEach", "Hours per Unit", 5000, 10000000, 1), num("totalHours", "Total Unit-Hours", 500000, 100000000000, 1), num("failures", "Failures", 4, 1000000), num("missionHours", "Mission Time (hours)", 8760, 1000000, 1)],
    results: [["mttfHours", "MTTF (hours)", "n"], ["mttfYears", "MTTF (years)", "n"], ["failureRatePerHour", "Failure Rate λ (per hour)", "n"], ["fitRate", "FIT (failures per 10⁹ h)", "n"], ["reliabilityAtMissionPercent", "Reliability at Mission Time", "p"], ["b10LifeHours", "B10 Life (hours)", "n"]],
    fn: E.mttf, ex: { mode: 0, units: 100, hoursEach: 5000, totalHours: 500000, failures: 4, missionHours: 8760 },
    exText: (o) => `Example: 100 units run 5,000 hours each with 4 failures give an MTTF of ${fmt(o.mttfHours, 0)} hours; the chance one survives a year of 24/7 use is ${o.reliabilityAtMissionPercent}%.`,
    how: "Enter the total operating hours accumulated and the number of failures. Use MTTF for non-repairable items; MTBF for repairable systems uses the same arithmetic.",
    assume: "Constant failure rate (exponential): R(t) = e^(−t/MTTF), B10 = 0.1054 × MTTF. Small failure counts give wide confidence intervals.",
    faq: [["What's the difference between MTTF and MTBF?", "MTTF is for parts you replace; MTBF is for systems you repair. Both are total time ÷ failures."]],
  }),
  mk({
    slug: "o-ring-calculator", title: "O-Ring Groove Calculator",
    desc: "Check an O-ring gland design — squeeze, stretch and gland fill for piston, rod or face seals, static or dynamic — against recommended ranges.",
    meta: "O-Ring Calculator — Squeeze, Stretch & Gland Fill",
    inputs: [dropdown("application", "Seal Type", opts(["Piston (male gland)", "Rod (female gland)", "Face seal"]), 0), yn("dynamic", "Dynamic (moving) Seal?"), num("oringId", "O-Ring Inside Diameter (in)", 1.475, 50, 0.001), num("crossSection", "O-Ring Cross-Section (in)", 0.139, 1, 0.001), num("boreDiameter", "Bore / Rod Diameter (in)", 1.75, 50, 0.001), num("grooveDiameter", "Groove Bottom Diameter (in)", 1.51, 50, 0.001), num("grooveDepth", "Face Groove Depth (in)", 0.1, 1, 0.001), num("grooveWidth", "Groove Width (in)", 0.188, 1, 0.001)],
    results: [["squeezePercent", "Squeeze (%)", "n"], ["stretchPercent", "Stretch (%)", "n"], ["glandFillPercent", "Gland Fill (%)", "n"], ["glandDepthIn", "Gland Depth (in)", "n"], ["effectiveCrossSectionIn", "Cross-Section after Stretch (in)", "n"], ["squeezeOk", "Squeeze in Range (1 = yes)", "n"], ["fillOk", "Fill ≤ 85% (1 = yes)", "n"], ["stretchOk", "Stretch ≤ 5% (1 = yes)", "n"]],
    fn: E.oring, ex: { application: 0, dynamic: 0, oringId: 1.475, crossSection: 0.139, boreDiameter: 1.75, grooveDiameter: 1.51, grooveDepth: 0.1, grooveWidth: 0.188 },
    exText: (o) => `Example: a 0.139 in cross-section ring in a piston groove of 1.51 in in a 1.75 in bore runs at ${o.squeezePercent}% squeeze, ${o.stretchPercent}% stretch and ${o.glandFillPercent}% gland fill.`,
    how: "Enter the O-ring size and gland dimensions. For rod seals, the groove diameter is the bore of the groove in the housing.",
    assume: "Gland depth = |bore − groove| ÷ 2; cross-section shrinks ~half the stretch percentage. Typical targets: static squeeze 15–30%, dynamic 10–20%, stretch < 5%, fill < 85% (Parker O-Ring Handbook guidance).",
    faq: [["How much should an O-ring be squeezed?", "About 15–30% for static seals and 10–20% for dynamic seals."]],
  }),
  mk({
    slug: "centrifuge-rpm-rcf-calculator", title: "Centrifuge RPM to RCF (×g) Calculator",
    desc: "Convert centrifuge speed between RPM and relative centrifugal force (×g) for any rotor radius — for Beckman, Eppendorf, Thermo and other centrifuge protocols.",
    meta: "Centrifuge Calculator — RPM ↔ RCF (Beckman-Style)",
    inputs: [dropdown("mode", "Convert", opts(["RPM → RCF (×g)", "RCF (×g) → RPM"]), 0), num("radiusMm", "Rotor Radius (mm, max radius from rotor manual)", 100, 500, 0.1, 10), num("rpm", "Speed (RPM)", 4000, 150000, 10), num("rcf", "RCF (×g)", 1800, 1000000, 1)],
    results: [["rcfXg", "Relative Centrifugal Force (×g)", "n"], ["rpm", "Speed (RPM)", "n"], ["radiusCm", "Radius (cm)", "n"]],
    fn: E.centrifuge, ex: { mode: 0, radiusMm: 100, rpm: 4000, rcf: 1800 },
    exText: (o) => `Example: 4,000 RPM on a rotor with a 100 mm radius is ${fmt(o.rcfXg, 0)} × g.`,
    how: "Find the rotor's maximum (or protocol-specified) radius in the manual and convert in either direction. Independent calculator — not affiliated with Beckman Coulter.",
    assume: "RCF = 1.118 × 10⁻⁵ × r (cm) × RPM². Always respect the rotor's rated maximum speed.",
    faq: [["How do I convert RPM to g-force?", "RCF = 1.118 × 10⁻⁵ × radius in cm × RPM²."]],
  }),
  mk({
    slug: "compression-spring-calculator", title: "Compression Spring Design Calculator",
    desc: "Design a helical compression spring — spring rate, load and shear stress at working deflection (Wahl-corrected), spring index, solid height, travel and load at solid.",
    meta: "Compression Spring Design Calculator — Rate, Stress & Solid Height",
    inputs: [dropdown("material", "Wire Material", opts(E.SPRING_G.map(([n]) => n)), 0), num("wireDiameter", "Wire Diameter (in)", 0.062, 1, 0.001), num("outerDiameter", "Outside Diameter (in)", 0.6, 12, 0.001), num("activeCoils", "Active Coils", 8, 200, 0.25, 0.5), dropdown("ends", "Ends", opts(["Closed & ground", "Closed, not ground", "Open, not ground", "Open & ground"]), 0), num("freeLength", "Free Length (in)", 2, 50, 0.001), num("workingDeflection", "Working Deflection (in)", 0.5, 50, 0.001)],
    results: [["springRateLbPerIn", "Spring Rate (lb/in)", "n"], ["loadAtWorkingLb", "Load at Working Deflection (lb)", "n"], ["shearStressPsi", "Corrected Shear Stress (psi)", "n"], ["springIndex", "Spring Index (D/d)", "n"], ["solidHeightIn", "Solid Height (in)", "n"], ["maxTravelIn", "Travel to Solid (in)", "n"], ["loadAtSolidLb", "Load at Solid (lb)", "n"], ["wahlFactor", "Wahl Factor", "n"]],
    fn: E.compressionSpring, ex: { material: 0, wireDiameter: 0.062, outerDiameter: 0.6, activeCoils: 8, ends: 0, freeLength: 2, workingDeflection: 0.5 },
    exText: (o) => `Example: 0.062 in music wire, 0.6 in OD and 8 active coils gives a rate of ${o.springRateLbPerIn} lb/in, ${o.loadAtWorkingLb} lb at 0.5 in deflection and ${fmt(o.shearStressPsi, 0)} psi stress.`,
    how: "Enter wire size, outside diameter, active coils, end type and free length.",
    assume: "k = G d⁴ ÷ (8 D³ Na), D = OD − d; stress τ = K_w × 8FD ÷ (π d³). Keep spring index between 4 and 12 and stress below ~45% of the wire's tensile strength for long fatigue life.",
    faq: [["How do I calculate spring rate?", "Rate = shear modulus × wire diameter⁴ ÷ (8 × mean diameter³ × active coils)."]],
  }),
  mk({
    slug: "mexico-manufacturing-cost-calculator", title: "Mexico Manufacturing Cost Calculator",
    desc: "Estimate monthly manufacturing labor and operating cost in Mexico — 2026 minimum wages, statutory benefits burden, shelter fees, facility and utilities — in USD versus US labor cost.",
    inputs: [num("workers", "Direct Workers", 50, 100000), dropdown("zone", "Wage Zone", opts(["General (MXN 315.04/day min.)", "Northern border free zone (MXN 440.87/day min.)"]), 1), cur("dailyWage", "Daily Wage Paid (MXN)", 520, 10000, 1), pct("burdenPercent", "Benefits & Taxes Burden (IMSS, INFONAVIT, aguinaldo, PTU…)", 45, 100, 1), num("hoursPerWeek", "Hours per Week", 48, 60, 1, 40), num("mxnPerUsd", "Exchange Rate (MXN per USD)", 18.5, 40, 0.01, 5), cur("shelterPerHour", "Shelter Service Fee per Labor Hour (USD)", 2.5, 20, 0.05), num("sqFt", "Plant Size (sq ft)", 40000, 10000000, 100), cur("rentPerSqFtMonth", "Industrial Rent per sq ft per Month (USD)", 0.6, 5, 0.01), cur("utilities", "Utilities per Month (USD)", 9000, 10000000, 10), cur("otherMonthly", "Other Monthly Costs (USD)", 6000, 10000000, 10), cur("usLoadedHourly", "Comparable US Loaded Labor Cost per Hour (USD)", 32, 200, 0.5)],
    results: [["monthlyCostUsd", "Total Monthly Cost (USD)", "c"], ["costPerLaborHourUsd", "All-In Cost per Labor Hour (USD)", "c"], ["loadedLaborPerHourUsd", "Loaded Labor per Hour (USD)", "c"], ["laborCostUsd", "Labor Cost per Month (USD)", "c"], ["shelterFees", "Shelter Fees (USD)", "c"], ["monthlySavingsVsUs", "Monthly Savings vs US Labor", "c"], ["annualSavingsVsUs", "Annual Savings vs US Labor", "c"]],
    fn: E.mexicoMfg, ex: { workers: 50, zone: 1, dailyWage: 520, burdenPercent: 45, hoursPerWeek: 48, mxnPerUsd: 18.5, shelterPerHour: 2.5, sqFt: 40000, rentPerSqFtMonth: 0.6, utilities: 9000, otherMonthly: 6000, usLoadedHourly: 32 },
    exText: (o) => `Example: 50 workers on the northern border at MXN 520 a day cost about ${usd(o.loadedLaborPerHourUsd)} per hour loaded; with a shelter, plant and utilities the operation runs ${usd(o.monthlyCostUsd)} a month — ${usd(o.annualSavingsVsUs)} a year less than US labor alone.`,
    how: "Enter headcount, wage zone and the daily wage you'll pay, your shelter provider's fee and facility costs. Exchange rates move — update them.",
    assume: "2026 minimum wages per CONASAMI: MXN 315.04/day general and MXN 440.87/day in the northern border zone. Statutory burden (social security, housing fund, 15-day aguinaldo, vacation premium, 10% profit sharing) typically adds 35–50%.",
    faq: [["How much does manufacturing labor cost in Mexico?", "Loaded direct labor in border cities commonly runs about $4–7 per hour in 2026, versus $25–40 in the US."]],
  }),
  mk({
    slug: "downtime-cost-calculator", title: "Downtime Cost Calculator",
    desc: "Calculate the cost of production downtime — lost profit on missed output, idle labor, repair, scrap and restart, overtime to recover and penalties — per event, per hour and per year.",
    inputs: [num("hours", "Downtime Duration (hours)", 4, 10000, 0.25), num("unitsPerHour", "Units Normally Produced per Hour", 120, 1000000), cur("marginPerUnit", "Contribution Margin per Unit", 18, 100000, 0.01), num("idleWorkers", "Workers Idled", 12, 10000), cur("laborRate", "Loaded Labor Rate per Hour", 32, 500, 0.5), cur("repairCost", "Repair Parts & Contractors", 2500, 10000000, 10), cur("scrapRestart", "Scrap & Restart Cost", 800, 10000000, 10), num("overtimeHours", "Overtime Hours to Recover", 0, 100000, 0.5), cur("overtimeRate", "Overtime Rate per Hour", 48, 500, 0.5), cur("penalties", "Late Delivery Penalties", 0, 10000000, 10), num("eventsPerYear", "Similar Events per Year", 6, 1000, 1)],
    results: [["costPerEvent", "Cost per Event", "c"], ["costPerHour", "Cost per Hour of Downtime", "c"], ["annualCost", "Annual Cost", "c"], ["lostProfit", "Lost Profit", "c"], ["idleLabor", "Idle Labor", "c"], ["recoveryOvertime", "Recovery Overtime", "c"]],
    fn: E.downtimeCost, ex: { hours: 4, unitsPerHour: 120, marginPerUnit: 18, idleWorkers: 12, laborRate: 32, repairCost: 2500, scrapRestart: 800, overtimeHours: 0, overtimeRate: 48, penalties: 0, eventsPerYear: 6 },
    exText: (o) => `Example: a 4-hour stop on a line making 120 units an hour at $18 margin, with 12 idle workers and $3,300 of repair and scrap, costs ${usd(o.costPerEvent)} — ${usd(o.costPerHour)} an hour, ${usd(o.annualCost)} a year at 6 events.`,
    how: "Enter the outage length, normal output and margin, and the direct costs of the event. If you recover output with overtime, enter that instead of lost profit (set margin to 0).",
    assume: "Lost profit uses contribution margin (price − variable cost), not revenue.",
    faq: [["How do you calculate downtime cost?", "Lost margin on missed output plus idle labor, repair, scrap and any recovery or penalty costs."]],
  }),
  mk({
    slug: "extrusion-cost-calculator", title: "Extrusion Cost Calculator",
    desc: "Estimate aluminum or plastic extrusion part cost — weight per foot and length, metal or resin price, conversion or extruder time, finishing, fabrication and die amortization.",
    inputs: [dropdown("material", "Process", opts(["Aluminum extrusion", "Plastic extrusion"]), 0), num("weightPerFoot", "Weight per Foot (lb/ft)", 0.8, 100, 0.001), num("lengthFt", "Part Length (ft)", 8, 100, 0.01), num("quantity", "Quantity", 2000, 10000000, 1, 1), pct("scrap", "Scrap / Butt Loss", 8, 50, 0.5), cur("materialPerLb", "Billet or Resin Price per lb", 1.65, 50, 0.01), cur("conversionPerLb", "Aluminum Conversion per lb", 1.6, 20, 0.01), cur("extruderRate", "Plastic Extruder Rate per Hour", 120, 2000, 1), num("outputLbPerHour", "Plastic Output (lb/h)", 300, 10000, 1, 1), cur("finishPerFoot", "Finishing per ft (anodize, paint)", 0.35, 50, 0.01), cur("fabricationEach", "Fabrication per Piece (cut, drill)", 0.5, 1000, 0.01), cur("dieCost", "Die Cost", 2500, 1000000, 10)],
    results: [["costPerPiece", "Cost per Piece", "c"], ["totalCost", "Total Cost", "c"], ["weightPerPieceLb", "Weight per Piece incl. Scrap (lb)", "n"], ["materialPerPiece", "Material per Piece", "c"], ["conversionPerPiece", "Conversion per Piece", "c"], ["dieAmortizationPerPiece", "Die Amortization per Piece", "c"], ["costPerLb", "Cost per lb", "c"]],
    fn: E.extrusionCost, ex: { material: 0, weightPerFoot: 0.8, lengthFt: 8, quantity: 2000, scrap: 8, materialPerLb: 1.65, conversionPerLb: 1.6, extruderRate: 120, outputLbPerHour: 300, finishPerFoot: 0.35, fabricationEach: 0.5, dieCost: 2500 },
    exText: (o) => `Example: 2,000 pieces of an 0.8 lb/ft aluminum profile cut to 8 ft cost about ${usd(o.costPerPiece)} each (${usd(o.costPerLb)} per lb) including anodizing and a $2,500 die.`,
    how: "Enter the profile's weight per foot (from the die drawing), cut length and quantity, and your supplier's metal and conversion prices.",
    assume: "Aluminum price = metal (LME + Midwest premium + billet premium) + conversion; plastic conversion from extruder rate ÷ output. Typical 2026 aluminum extrusions run $3–5 per lb mill finish.",
    faq: [["How much does an aluminum extrusion die cost?", "Usually $1,000–5,000 for common profiles, more for large or hollow shapes."]],
  }),
  mk({
    slug: "press-brake-tonnage-calculator", title: "Press Brake Tonnage & Bend Calculator",
    desc: "Calculate press brake tonnage for air bending, bottoming or coining — tons per foot and total by material, thickness and die opening — with inside radius, bend allowance, deduction and minimum flange.",
    meta: "Press Brake Tonnage Calculator — Bend Allowance & V-Die",
    inputs: [num("thickness", "Material Thickness (in)", 0.125, 2, 0.001), num("dieOpening", "V-Die Opening (in, 0 = 8× thickness)", 1, 12, 0.001), dropdown("material", "Material", opts(E.BRAKE_MATERIAL.map(([n]) => n)), 0), dropdown("method", "Bending Method", opts(["Air bending", "Bottoming (×4)", "Coining (×8)"]), 0), num("bendLength", "Bend Length (ft)", 4, 40, 0.01), num("bendAngle", "Bend Angle (°)", 90, 179, 1, 1), num("kFactor", "K-Factor", 0.44, 0.5, 0.01, 0.2)],
    results: [["totalTons", "Total Tonnage", "n"], ["tonsPerFoot", "Tons per Foot", "n"], ["dieOpeningIn", "V-Die Opening (in)", "n"], ["insideRadiusIn", "Inside Radius (in, air bend)", "n"], ["bendAllowanceIn", "Bend Allowance (in)", "n"], ["bendDeductionIn", "Bend Deduction (in)", "n"], ["minFlangeIn", "Minimum Flange (in)", "n"]],
    fn: E.pressBrake, ex: { thickness: 0.125, dieOpening: 1, material: 0, method: 0, bendLength: 4, bendAngle: 90, kFactor: 0.44 },
    exText: (o) => `Example: air bending 1/8 in mild steel over a 1 in V-die needs ${o.tonsPerFoot} tons per foot — ${o.totalTons} tons for a 4 ft bend — with an inside radius of about ${o.insideRadiusIn} in.`,
    how: "Enter thickness, die opening (or leave 0 for 8× thickness), material and bend length. Never exceed the brake's rated tons per foot of the tooling.",
    assume: "Air bending: tons/ft = 575 T² ÷ V for 60 ksi steel × material factor; bottoming ≈ 4× and coining ≈ 8×. Inside radius ≈ V ÷ 6.4 (≈ 16% of V). BA = θ(IR + K·T); BD = 2·OSSB − BA.",
    faq: [["How do you calculate press brake tonnage?", "Tons per foot ≈ 575 × thickness² ÷ die opening for mild steel, then multiply by bend length."]],
  }),
  mk({
    slug: "punch-forming-tonnage-calculator", title: "Punching & Forming Tonnage Calculator",
    desc: "Calculate press tonnage to punch or blank holes and shapes — perimeter × thickness × shear strength — with stripping force, simultaneous holes and recommended press size.",
    meta: "Forming Tonnage Calculator — Punch & Blanking Force",
    inputs: [dropdown("shape", "Hole / Blank Shape", opts(["Round", "Rectangle / square", "Custom perimeter"]), 0), num("diameter", "Diameter (in)", 1, 60, 0.001), num("length", "Length (in)", 2, 120, 0.001), num("width", "Width (in)", 1, 120, 0.001), num("perimeter", "Custom Perimeter (in)", 10, 1000, 0.01), num("thickness", "Material Thickness (in)", 0.25, 2, 0.001), dropdown("material", "Material", opts(E.SHEAR_STRENGTH.map(([n, s]) => `${n} (${(s / 1000).toFixed(0)} ksi shear)`)), 0), num("holes", "Holes Punched at Once", 1, 500, 1, 1), pct("strippingPercent", "Stripping Force", 10, 30, 1)],
    results: [["recommendedPressTons", "Recommended Press (tons, +20%)", "n"], ["punchingTons", "Punching Force (tons)", "n"], ["strippingTons", "Stripping Force (tons)", "n"], ["punchingForceLb", "Punching Force (lb)", "n"], ["kiloNewtons", "Punching Force (kN)", "n"], ["perimeterIn", "Cut Perimeter (in)", "n"]],
    fn: E.punchTonnage, ex: { shape: 0, diameter: 1, length: 2, width: 1, perimeter: 10, thickness: 0.25, material: 0, holes: 1, strippingPercent: 10 },
    exText: (o) => `Example: punching a 1 in hole in 1/4 in mild steel takes ${o.punchingTons} tons; with stripping and a 20% margin use at least a ${o.recommendedPressTons}-ton press.`,
    how: "Choose the shape and dimensions, material thickness and type, and how many holes the die punches at once.",
    assume: "Force = perimeter × thickness × shear strength (≈ 80% of tensile). Shear angle on the punch can reduce force 30–50%.",
    faq: [["How much tonnage to punch a hole?", "Tons ≈ diameter × thickness × 80 for mild steel (inches) — about 20 tons for a 1 in hole in 1/4 in plate."]],
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
