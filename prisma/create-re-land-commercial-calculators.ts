// One-time (but safe to re-run) batch setup script: creates 13 land, construction & building
// cost tools and 6 commercial real estate tools from the user's real estate list
// (Real Estate Calculators > Land, Construction & Building Cost / Commercial Real Estate).
// The math lives in src/lib/calc-engine-re-land-commercial.ts; every example below is
// computed from that engine, so the copy always matches the calculator.
//
// HOW TO RUN (after prisma/restructure-real-estate-main-category.ts --apply)
//   npx tsx prisma/create-re-land-commercial-calculators.ts
// or
//   npm run db:create-re-land-commercial-calculators

import * as E from "../src/lib/calc-engine-re-land-commercial";
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

function numberField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return { key, label, type: "number", unit: opts.unit, required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 1000, step: opts.step ?? 1 };
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
  category: string;
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

const YN = (key: string, label: string, def: number) => dropdown(key, label, [["No", 0], ["Yes", 1]], def);

const LAND = "land-construction-building-cost-calculators";
const COMMERCIAL = "commercial-real-estate-calculators";

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const round = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const run = (fn: E.CustomCalculator, values: Record<string, number>) => fn(values) as Record<string, number>;

/** Each state's own building notes. */
const BUILD_NOTES: Record<string, string> = {
  "cost-to-build-calculator": "National averages: builder-grade new homes often cost $150–$200 per finished square foot to build, mid-range $200–$275 and custom $275–$400+, before land. Costs are highest in the Northeast, West Coast and Hawaii and lowest in the South and Midwest — use the regional factor.",
  "texas-cost-to-build-a-house-calculator": "Texas is one of the cheaper states to build in — slab foundations, a large builder market and fewer code add-ons — typically $140–$190 per sq ft for builder grade. Austin and Dallas suburbs cost more than San Antonio, Houston exurbs and West Texas; rural lots may need a septic system, well and long utility runs. Many Texas counties outside city limits don't require building permits.",
  "cost-to-build-a-house-in-michigan-calculator": "Michigan homes usually need basements and frost-depth footings, plus heavier insulation and heating for the climate — typically $160–$210 per sq ft for builder grade. Costs are highest around Ann Arbor, Oakland County and Grand Rapids, lower in mid-Michigan and the U.P. (where materials travel further).",
  "cost-to-build-a-house-in-mn-calculator": "Minnesota's energy code, deep frost footings, basements and a short building season push costs to roughly $175–$230 per sq ft for builder grade, more in the Twin Cities metro. Winter builds add heating and protection costs; many lots outside the metro need wells and septic systems.",
  "cost-to-build-a-house-in-pa-calculator": "Pennsylvania building costs run about $165–$220 per sq ft for builder grade — higher around Philadelphia's suburbs and Pittsburgh, lower in central and northern PA. The Uniform Construction Code applies statewide; basements are common, and well and septic permits come from the township or county.",
  "cost-to-build-a-house-in-florida-calculator": "Florida homes are built to the Florida Building Code's wind standards — concrete block (CBS) walls, impact windows or shutters and strapped roofs — and coastal lots may need elevated foundations for flood zones. Builder-grade costs are about $160–$215 per sq ft, higher in South Florida and on the coasts.",
  "cost-to-build-a-house-in-nc-calculator": "North Carolina building costs are near the national average — about $150–$200 per sq ft for builder grade, more in Raleigh-Durham, Charlotte and the mountains (steep lots) and less in eastern NC. Crawl-space foundations are common, and coastal counties have wind and flood requirements.",
};

const buildTool = (slug: string, title: string): ToolDef => {
  const st = E.BUILD_STATES[slug];
  const ex = run(E.costToBuild, { squareFeet: st.sqft, baseCostPerSqFt: st.base, quality: 1, regionalFactor: 100, garageSqFt: 450, siteWork: 30000, permitPercent: 2, designPercent: 5, contingencyPercent: 10, landCost: 80000 });
  const place = st.name;
  return {
    slug,
    title,
    category: LAND,
    description: `Estimate the cost to build a house in ${place} — construction cost per square foot by quality, garage, site work, permits, design fees and a contingency, with and without the land.`,
    metaTitle: `${title} — Cost per Square Foot`.slice(0, 70),
    metaDescription: `Free cost to build a house calculator for ${place}. Estimate construction cost by size and quality, plus site work, permits, design, contingency and land.`,
    calcInputs: [
      numberField("squareFeet", "Finished Square Feet", { default: st.sqft, min: 200, max: 20000 }),
      currencyField("baseCostPerSqFt", `Base Cost per Sq Ft in ${place} (Builder Grade)`, { default: st.base, max: 1000 }),
      dropdown("quality", "Finish Quality", [["Builder Grade", 0], ["Mid-Range (×1.25)", 1], ["Custom (×1.6)", 2], ["Luxury (×2.3)", 3]], 1),
      percentField("regionalFactor", "Local Cost Factor (100 = Average)", { default: 100, min: 60, max: 200, step: 5 }),
      numberField("garageSqFt", "Garage Square Feet", { default: 450, max: 3000, required: false }),
      currencyField("siteWork", "Site Work (Clearing, Utilities, Septic, Well, Driveway)", { default: 30000, max: 1000000, step: 500, required: false }),
      percentField("permitPercent", "Permits & Fees", { default: 2, max: 10, step: 0.5 }),
      percentField("designPercent", "Architect / Plans & Engineering", { default: 5, max: 20, step: 0.5 }),
      percentField("contingencyPercent", "Contingency", { default: 10, max: 30, step: 1 }),
      currencyField("landCost", "Land Cost", { default: 80000, max: 10000000, step: 1000, required: false }),
    ],
    calcResult: { label: "Total Cost to Build", format: "currency" },
    calcResults: [
      { key: "totalCostToBuild", label: "Total Cost to Build (Without Land)", format: "currency", highlight: true },
      { key: "constructionCost", label: "House & Garage Construction", format: "currency" },
      { key: "costPerSqFt", label: "All-In Cost per Sq Ft", format: "currency" },
      { key: "permitsAndDesign", label: "Permits, Plans & Engineering", format: "currency" },
      { key: "contingency", label: "Contingency", format: "currency" },
      { key: "totalWithLand", label: "Total Including Land", format: "currency" },
    ],
    instructions: `Enter the finished square footage and pick a finish level. The base cost starts at a typical ${place} builder-grade price; adjust it with a local builder's quote or the local cost factor. Add the garage, site work, permits, design and contingency, and the land if you still need to buy it.`,
    examples: `Example: a ${st.sqft.toLocaleString("en-US")} sq ft builder-grade home in ${place} at ${round(st.base)}/sq ft with a 450 sq ft garage and $30,000 of site work costs about ${money(ex.totalCostToBuild)} including permits, design and a 10% contingency — ${money(ex.costPerSqFt)} per sq ft all-in, or ${money(ex.totalWithLand)} with an $80,000 lot.`,
    assumptions: `${BUILD_NOTES[slug]}\n\nGarages are priced at about 45% of the house rate. Costs moved with lumber, labor and tariffs in 2025–26, so get at least two builder bids. A construction loan adds interest during the build.`,
    faq: [
      { question: `How much does it cost to build a house in ${place}?`, answer: `About ${money(ex.costPerSqFt)} per sq ft all-in for builder grade in this example, before land — more for custom finishes or difficult lots.` },
      { question: "Is it cheaper to build or buy a house?", answer: "Buying an existing home is usually cheaper per square foot; building costs more but gets you new systems, energy efficiency and your own layout." },
    ],
  };
};

const ex = {
  permit: run(E.buildingPermitCost, { projectValuation: 400000, permitRate: 1, minimumFee: 100, planReviewPercent: 65, electricalPermit: 250, plumbingPermit: 250, mechanicalPermit: 200, stateSurchargePercent: 3, impactFees: 8000 }),
  survey: run(E.landSurveyCost, { surveyType: 0, acres: 5, terrain: 1, regionalFactor: 100, cornersToSet: 4, costPerCorner: 150, recordingFees: 50 }),
  acre: run(E.pricePerAcre, { price: 180000, size: 12, sizeUnit: 0, comparablePricePerAcre: 14000 }),
  dev: run(E.landDevelopmentCost, { acres: 20, lots: 40, roadFeet: 2400, roadCostPerFoot: 450, waterSewerPerLot: 15000, drySumpPerLot: 5000, gradingPerAcre: 8000, stormwater: 250000, engineeringPercent: 8, permitsImpactPerLot: 6000, contingencyPercent: 10, landCost: 800000, lotSalePrice: 120000 }),
  ti: run(E.tenantImprovementAllowance, { squareFeet: 3000, allowancePerSqFt: 40, buildoutCostPerSqFt: 65, otherCosts: 0, amortizeExcess: 1, amortizationRate: 8, leaseYears: 7 }),
  lvb: run(E.leaseVsBuyCommercial, { squareFeet: 5000, leaseRentPerSqFt: 22, nnnPerSqFt: 8, rentEscalation: 3, years: 10, purchasePrice: 2000000, downPaymentPercent: 25, interestRate: 7, loanTerm: 25, closingCostPercent: 3, ownershipCostPercent: 3, appreciationRate: 3, sellingCostPercent: 5, opportunityRate: 6 }),
  wh: run(E.warehouseLease, { squareFeet: 20000, baseRentPerSqFt: 9, nnnPerSqFt: 2.5, annualEscalation: 3.5, termYears: 5, freeRentMonths: 3, monthlyUtilities: 1500, tiAllowance: 0, palletPositions: 2400 }),
  def: run(E.defeasance, { loanBalance: 5000000, noteRate: 4.5, monthsToMaturity: 48, amortizationYears: 30, interestOnly: 0, treasuryYield: 3.9, transactionFees: 75000 }),
};

const TOOLS: ToolDef[] = [
  buildTool("cost-to-build-calculator", "Cost to Build Calculator"),
  buildTool("texas-cost-to-build-a-house-calculator", "Texas Cost to Build a House Calculator"),
  buildTool("cost-to-build-a-house-in-michigan-calculator", "Cost to Build a House in Michigan Calculator"),
  buildTool("cost-to-build-a-house-in-mn-calculator", "Cost to Build a House in MN Calculator"),
  buildTool("cost-to-build-a-house-in-pa-calculator", "Cost to Build a House in PA Calculator"),
  buildTool("cost-to-build-a-house-in-florida-calculator", "Cost to Build a House in Florida Calculator"),
  buildTool("cost-to-build-a-house-in-nc-calculator", "Cost to Build a House in NC Calculator"),
  {
    slug: "building-permit-cost-calculator",
    title: "Building Permit Cost Calculator",
    category: LAND,
    description: "Estimate building permit costs for a new home, addition or remodel — the permit fee on project valuation, plan review, electrical, plumbing and mechanical permits, impact fees and state surcharges.",
    metaTitle: "Building Permit Cost Calculator — Permit, Plan Review & Fees",
    metaDescription: "Free building permit cost calculator. Estimate the permit fee, plan review, trade permits, impact fees and surcharges for your project.",
    calcInputs: [
      currencyField("projectValuation", "Project Valuation (Construction Cost)", { default: 400000, max: 50000000, step: 1000 }),
      percentField("permitRate", "Permit Fee (% of Valuation)", { default: 1, max: 5, step: 0.05 }),
      currencyField("minimumFee", "Minimum Permit Fee", { default: 100, max: 5000, required: false }),
      percentField("planReviewPercent", "Plan Review (% of Permit Fee)", { default: 65, max: 100, step: 5 }),
      currencyField("electricalPermit", "Electrical Permit", { default: 250, max: 20000, required: false }),
      currencyField("plumbingPermit", "Plumbing Permit", { default: 250, max: 20000, required: false }),
      currencyField("mechanicalPermit", "Mechanical / HVAC Permit", { default: 200, max: 20000, required: false }),
      percentField("stateSurchargePercent", "State Surcharge / Technology Fee", { default: 3, max: 10, step: 0.5, required: false }),
      currencyField("impactFees", "Impact, School & Utility Connection Fees", { default: 8000, max: 200000, step: 100, required: false }),
    ],
    calcResult: { label: "Total Permit Cost", format: "currency" },
    calcResults: [
      { key: "totalPermitCost", label: "Total Permit & Fee Cost", format: "currency", highlight: true },
      { key: "buildingPermitFee", label: "Building Permit Fee", format: "currency" },
      { key: "planReviewFee", label: "Plan Review Fee", format: "currency" },
      { key: "tradePermits", label: "Electrical, Plumbing & Mechanical", format: "currency" },
      { key: "impactFees", label: "Impact & Connection Fees", format: "currency" },
      { key: "stateSurcharge", label: "State Surcharge", format: "currency" },
      { key: "shareOfProjectCost", label: "Fees as % of Project Cost", format: "percentage" },
    ],
    instructions: "Enter the project's valuation (most building departments use the construction cost or an ICC per-square-foot table), your city's permit rate and plan review percentage, and any trade permits and impact fees from its fee schedule.",
    examples: `Example: a $400,000 new home at 1% pays a ${money(ex.permit.buildingPermitFee)} permit fee and ${money(ex.permit.planReviewFee)} of plan review; with trade permits, a 3% surcharge and $8,000 of impact fees, the total is ${money(ex.permit.totalPermitCost)} — about ${ex.permit.shareOfProjectCost}% of the project.`,
    assumptions: "Permit fees vary hugely: many cities use the ICC valuation tables with a sliding fee, others a flat rate per square foot. Impact fees for new homes range from zero to $30,000+ in fast-growing areas (California and Florida are highest). Remodels usually skip impact fees. Some rural counties don't require building permits.",
    faq: [
      { question: "How much does a building permit cost?", answer: "Often $1,000–$5,000 for a new home's building permit itself, and $10,000+ once impact and utility fees are added." },
      { question: "How are building permit fees calculated?", answer: "Usually as a percentage or sliding scale of the project's valuation, plus plan review and separate trade permits." },
    ],
  },
  {
    slug: "land-survey-cost-calculator",
    title: "Land Survey Cost Calculator",
    category: LAND,
    description: "Estimate the cost of a land survey — boundary, topographic, ALTA/NSPS, mortgage or subdivision survey — by acreage, terrain, corners to set and local prices.",
    metaTitle: "Land Survey Cost Calculator — Boundary, Topo & ALTA",
    metaDescription: "Free land survey cost calculator. Estimate boundary, topographic, ALTA and mortgage survey costs by acreage, terrain and corners.",
    calcInputs: [
      dropdown("surveyType", "Survey Type", [["Boundary Survey", 0], ["Topographic Survey", 1], ["ALTA/NSPS Survey", 2], ["Mortgage / Location Survey", 3], ["Subdivision / Plat", 4]], 0),
      numberField("acres", "Acres", { default: 5, min: 0.05, max: 5000, step: 0.05 }),
      dropdown("terrain", "Terrain", [["Open / Flat", 0], ["Wooded", 1], ["Hilly / Dense Brush", 2]], 1),
      percentField("regionalFactor", "Local Price Factor (100 = Average)", { default: 100, min: 60, max: 200, step: 5 }),
      numberField("cornersToSet", "Corner Pins to Set", { default: 4, max: 100, required: false }),
      currencyField("costPerCorner", "Cost per Corner Pin", { default: 150, max: 1000, required: false }),
      currencyField("recordingFees", "Recording / Plat Filing Fees", { default: 50, max: 5000, required: false }),
    ],
    calcResult: { label: "Estimated Survey Cost", format: "currency" },
    calcResults: [
      { key: "estimatedSurveyCost", label: "Estimated Survey Cost", format: "currency", highlight: true },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
      { key: "fieldworkAndDrafting", label: "Fieldwork & Drafting", format: "currency" },
      { key: "cornerMonuments", label: "Corner Monuments", format: "currency" },
      { key: "costPerAcre", label: "Cost per Acre", format: "currency" },
    ],
    instructions: "Choose the survey type, the acreage and terrain, and the corners the surveyor will need to set. Use the local price factor for high-cost areas.",
    examples: `Example: a boundary survey on 5 wooded acres with 4 new corner pins costs about ${money(ex.survey.estimatedSurveyCost)} (a range of ${money(ex.survey.lowEstimate)}–${money(ex.survey.highEstimate)}).`,
    assumptions: "Per-acre cost falls as parcels get bigger. Prices rise with poor or missing records, many corners, steep or overgrown land and rush jobs. ALTA surveys for commercial lenders are the most detailed and expensive. Always use a licensed land surveyor in your state.",
    faq: [
      { question: "How much does a land survey cost?", answer: "Often $400–$1,000 for a lot boundary survey and $1,500–$5,000+ for large or wooded acreage." },
      { question: "Do I need a survey when buying land?", answer: "It's strongly recommended — it confirms the boundaries, easements and encroachments, and many lenders and title insurers require one." },
    ],
  },
  {
    slug: "price-per-acre-calculator",
    title: "Price per Acre Calculator",
    category: LAND,
    description: "Work out the price per acre of land from its price and size in acres, square feet or hectares — plus price per square foot and hectare, and how it compares with comparable land sales.",
    metaTitle: "Price per Acre Calculator — Land Price per Acre",
    metaDescription: "Free price per acre calculator. Get land price per acre, per square foot and per hectare, and compare it with comparable sales.",
    calcInputs: [
      currencyField("price", "Land Price", { default: 180000, max: 100000000, step: 1000 }),
      numberField("size", "Land Size", { default: 12, min: 0.001, max: 10000000, step: 0.01 }),
      dropdown("sizeUnit", "Size Unit", [["Acres", 0], ["Square Feet", 1], ["Hectares", 2]], 0),
      currencyField("comparablePricePerAcre", "Comparable Sales Price per Acre (Optional)", { default: 14000, max: 10000000, step: 100, required: false }),
    ],
    calcResult: { label: "Price per Acre", format: "currency" },
    calcResults: [
      { key: "pricePerAcre", label: "Price per Acre", format: "currency", highlight: true },
      { key: "pricePerSqFt", label: "Price per Square Foot", format: "currency" },
      { key: "pricePerHectare", label: "Price per Hectare", format: "currency" },
      { key: "acres", label: "Size in Acres", format: "number", decimals: 4 },
      { key: "valueAtComparableRate", label: "Value at the Comparable Rate", format: "currency" },
      { key: "differenceVsComparable", label: "Above (+) / Below (−) Comparables", format: "percentage" },
    ],
    instructions: "Enter the asking or sale price and the land's size in acres, square feet or hectares. Add the price per acre of similar nearby land sales to compare.",
    examples: `Example: 12 acres for $180,000 is ${money(ex.acre.pricePerAcre)} per acre (${money(ex.acre.pricePerSqFt)} per sq ft). At a comparable $14,000 an acre, it's worth about ${money(ex.acre.valueAtComparableRate)} — the asking price is ${ex.acre.differenceVsComparable}% above comps.`,
    assumptions: "1 acre = 43,560 sq ft = 0.4047 hectares. Price per acre usually falls as parcel size grows, so compare with sales of similar size, road frontage, utilities, zoning and use (farm, timber, recreational or buildable).",
    faq: [
      { question: "How do you calculate price per acre?", answer: "Divide the total price by the number of acres — $180,000 for 12 acres is $15,000 an acre." },
      { question: "How many square feet are in an acre?", answer: "43,560 square feet." },
    ],
  },
  {
    slug: "land-development-cost-calculator",
    title: "Land Development Cost Calculator",
    category: LAND,
    description: "Estimate the cost to develop raw land into finished lots — roads, water and sewer, dry utilities, grading, stormwater, engineering, permits and impact fees — per lot and per acre, with your margin on lot sales.",
    metaTitle: "Land Development Cost Calculator — Cost per Finished Lot",
    metaDescription: "Free land development cost calculator. Estimate roads, utilities, grading, engineering and fees per lot, and the profit on finished lot sales.",
    calcInputs: [
      numberField("acres", "Acres", { default: 20, min: 0.1, max: 10000, step: 0.1 }),
      numberField("lots", "Number of Lots", { default: 40, min: 1, max: 10000 }),
      currencyField("landCost", "Raw Land Cost", { default: 800000, max: 100000000, step: 1000 }),
      numberField("roadFeet", "Road Length (Feet)", { default: 2400, max: 100000 }),
      currencyField("roadCostPerFoot", "Road Cost per Foot (Paving, Curb, Sidewalk)", { default: 450, max: 5000 }),
      currencyField("waterSewerPerLot", "Water & Sewer per Lot", { default: 15000, max: 200000, step: 500 }),
      currencyField("drySumpPerLot", "Electric, Gas & Telecom per Lot", { default: 5000, max: 100000, step: 500 }),
      currencyField("gradingPerAcre", "Clearing & Grading per Acre", { default: 8000, max: 200000, step: 500 }),
      currencyField("stormwater", "Stormwater Ponds & Drainage", { default: 250000, max: 20000000, step: 1000 }),
      percentField("engineeringPercent", "Engineering & Surveying (% of Hard Costs)", { default: 8, max: 25, step: 0.5 }),
      currencyField("permitsImpactPerLot", "Permits & Impact Fees per Lot", { default: 6000, max: 100000, step: 100 }),
      percentField("contingencyPercent", "Contingency", { default: 10, max: 30, step: 1 }),
      currencyField("lotSalePrice", "Finished Lot Sale Price", { default: 120000, max: 10000000, step: 1000, required: false }),
    ],
    calcResult: { label: "Total Development Cost", format: "currency" },
    calcResults: [
      { key: "totalDevelopmentCost", label: "Total Development Cost (Excl. Land)", format: "currency", highlight: true },
      { key: "costPerLot", label: "Development Cost per Lot", format: "currency" },
      { key: "finishedLotCost", label: "Finished Lot Cost incl. Land", format: "currency" },
      { key: "costPerAcre", label: "Development Cost per Acre", format: "currency" },
      { key: "profitPerLot", label: "Profit per Lot", format: "currency" },
      { key: "marginOnSales", label: "Margin on Lot Sales", format: "percentage" },
    ],
    instructions: "Enter the site's acreage and planned lots, the raw land cost and the engineer's quantities — road length, utilities per lot, grading and stormwater — plus soft costs and fees. Add the price builders will pay per finished lot to see your margin.",
    examples: `Example: a 20-acre, 40-lot subdivision with 2,400 ft of road costs about ${money(ex.dev.totalDevelopmentCost)} to develop — ${money(ex.dev.costPerLot)} per lot. With $800,000 of land, each finished lot costs ${money(ex.dev.finishedLotCost)}; selling at $120,000 leaves ${money(ex.dev.profitPerLot)} per lot (${ex.dev.marginOnSales}%).`,
    assumptions: "Hard costs include roads, utilities, grading and stormwater; soft costs include engineering, surveying, permits and impact fees. Financing, carrying costs, marketing and entitlement time aren't included. Developers commonly target 20%+ margins to cover risk.",
    faq: [
      { question: "How much does it cost to develop land per lot?", answer: "Often $40,000–$100,000+ per lot for suburban subdivisions with roads and public utilities, before the land." },
      { question: "What costs are included in land development?", answer: "Roads, water, sewer, power, grading, stormwater, engineering, permits and impact fees." },
    ],
  },
  {
    slug: "real-estate-area-calculator",
    title: "Real Estate Area Calculator",
    category: LAND,
    description: "Calculate a home's or building's square footage from up to four rectangular sections, convert it to square meters and acres, and get the price per square foot and per square meter.",
    metaTitle: "Real Estate Area Calculator — Square Footage of a House",
    metaDescription: "Free real estate area calculator. Add up a house's square footage from its sections, convert to square meters and get price per square foot.",
    calcInputs: [
      numberField("length1", "Section 1 Length (Feet)", { default: 40, max: 10000, step: 0.5 }),
      numberField("width1", "Section 1 Width (Feet)", { default: 30, max: 10000, step: 0.5 }),
      numberField("length2", "Section 2 Length (Feet)", { default: 20, max: 10000, step: 0.5, required: false }),
      numberField("width2", "Section 2 Width (Feet)", { default: 15, max: 10000, step: 0.5, required: false }),
      numberField("length3", "Section 3 Length (Feet)", { default: 0, max: 10000, step: 0.5, required: false }),
      numberField("width3", "Section 3 Width (Feet)", { default: 0, max: 10000, step: 0.5, required: false }),
      numberField("length4", "Section 4 Length (Feet)", { default: 0, max: 10000, step: 0.5, required: false }),
      numberField("width4", "Section 4 Width (Feet)", { default: 0, max: 10000, step: 0.5, required: false }),
      currencyField("price", "Price or Value (Optional)", { default: 450000, max: 100000000, step: 1000, required: false }),
    ],
    calcResult: { label: "Total Square Feet", format: "number" },
    calcResults: [
      { key: "totalSquareFeet", label: "Total Square Feet", format: "number", highlight: true },
      { key: "squareMeters", label: "Square Meters", format: "number" },
      { key: "acres", label: "Acres", format: "number", decimals: 4 },
      { key: "pricePerSquareFoot", label: "Price per Square Foot", format: "currency" },
      { key: "pricePerSquareMeter", label: "Price per Square Meter", format: "currency" },
    ],
    instructions: "Split the floor plan into rectangles and enter each one's outside length and width (repeat for each finished floor). Leave unused sections at 0. Add the price to get price per square foot.",
    examples: "Example: a 40×30 main section plus a 20×15 wing is 1,500 sq ft (139.35 m²). At $450,000, that's $300.00 per sq ft.",
    assumptions: "US residential square footage (ANSI Z765) is measured to the outside of exterior walls and counts finished, heated living space with at least 7 ft ceilings; garages, unfinished basements and open porches are excluded. Appraisers and listings may measure differently.",
    faq: [
      { question: "How do you calculate the square footage of a house?", answer: "Break it into rectangles, multiply each length by width, and add them up for every finished floor." },
      { question: "Does a basement count as square footage?", answer: "Below-grade space is usually listed separately from above-grade living area, even when finished." },
    ],
  },
  {
    slug: "square-feet-lot-size-calculator",
    title: "Square Feet Lot Size Calculator",
    category: LAND,
    description: "Calculate a lot's size in square feet and acres from its dimensions — rectangular, irregular four-sided, triangular or trapezoid lots — with square meters, hectares and square yards.",
    metaTitle: "Lot Size Calculator — Square Feet to Acres",
    metaDescription: "Free lot size calculator. Find a lot's area in square feet and acres for rectangular, irregular, triangle and trapezoid lots.",
    calcInputs: [
      dropdown("shape", "Lot Shape", [["Rectangle (Frontage × Depth)", 0], ["Irregular 4 Sides (Front, Left, Rear, Right)", 1], ["Triangle (Base × Height)", 2], ["Trapezoid (Front, Depth, Rear)", 3]], 0),
      numberField("sideA", "Side A — Frontage / Front / Base (Feet)", { default: 80, max: 100000, step: 0.5 }),
      numberField("sideB", "Side B — Depth / Left Side / Height (Feet)", { default: 125, max: 100000, step: 0.5 }),
      numberField("sideC", "Side C — Rear (Feet)", { default: 0, max: 100000, step: 0.5, required: false }),
      numberField("sideD", "Side D — Right Side (Feet)", { default: 0, max: 100000, step: 0.5, required: false }),
    ],
    calcResult: { label: "Lot Square Feet", format: "number" },
    calcResults: [
      { key: "lotSquareFeet", label: "Lot Size (Square Feet)", format: "number", highlight: true },
      { key: "acres", label: "Acres", format: "number", decimals: 4 },
      { key: "squareMeters", label: "Square Meters", format: "number" },
      { key: "hectares", label: "Hectares", format: "number", decimals: 4 },
      { key: "squareYards", label: "Square Yards", format: "number" },
    ],
    instructions: "Pick the lot's shape and enter its dimensions from the plat or survey. For an irregular four-sided lot, enter the front, left side, rear and right side — the calculator multiplies the average width by the average depth.",
    examples: "Example: an 80 × 125 ft lot is 10,000 sq ft — 0.2296 acres or about 929 m².",
    assumptions: "The irregular-lot method is a good estimate when the angles are close to square; very skewed lots need the surveyor's legal description or GIS area. 1 acre = 43,560 sq ft; 1 hectare = 10,000 m².",
    faq: [
      { question: "How do I calculate my lot size in acres?", answer: "Multiply length by width in feet and divide by 43,560 — an 80×125 lot is 0.23 acres." },
      { question: "What is a typical lot size?", answer: "New US single-family lots are often 6,000–10,000 sq ft (0.14–0.23 acres)." },
    ],
  },
  {
    slug: "percentage-rent-calculator",
    title: "Percentage Rent Calculator",
    category: COMMERCIAL,
    description: "Calculate percentage rent on a retail lease — the natural breakpoint (base rent ÷ percentage), any artificial breakpoint, the overage rent due on sales above it and your total occupancy cost as a share of sales.",
    metaTitle: "Percentage Rent Calculator — Breakpoint & Overage Rent",
    metaDescription: "Free percentage rent calculator. Find the natural breakpoint, percentage (overage) rent due, total rent and occupancy cost for a retail lease.",
    calcInputs: [
      currencyField("grossSales", "Yearly Gross Sales", { default: 1500000, max: 1000000000, step: 1000 }),
      currencyField("annualBaseRent", "Yearly Base Rent", { default: 60000, max: 100000000, step: 100 }),
      percentField("percentageRate", "Percentage Rate", { default: 6, max: 20, step: 0.25 }),
      currencyField("artificialBreakpoint", "Artificial Breakpoint (0 = Natural)", { default: 0, max: 1000000000, step: 1000, required: false }),
      currencyField("annualNnnCharges", "Yearly NNN / CAM Charges", { default: 18000, max: 10000000, step: 100, required: false }),
    ],
    calcResult: { label: "Percentage Rent Due", format: "currency" },
    calcResults: [
      { key: "percentageRentDue", label: "Percentage (Overage) Rent Due", format: "currency", highlight: true },
      { key: "totalRent", label: "Total Rent (Base + Percentage)", format: "currency" },
      { key: "breakpointUsed", label: "Breakpoint Used", format: "currency" },
      { key: "naturalBreakpoint", label: "Natural Breakpoint", format: "currency" },
      { key: "occupancyCostOfSales", label: "Occupancy Cost as % of Sales", format: "percentage" },
    ],
    instructions: "Enter the tenant's gross sales for the lease year, the base rent and the percentage rate in the lease. If the lease sets a fixed (artificial) breakpoint, enter it; otherwise the natural breakpoint is used.",
    examples: "Example: $60,000 of base rent at 6% gives a natural breakpoint of $1,000,000. With $1,500,000 of sales, the tenant owes 6% of the $500,000 above it — $30,000.00 — for $90,000.00 of total rent, a 7.2% occupancy cost with NNN.",
    assumptions: "Natural breakpoint = base rent ÷ percentage rate. Leases define which sales count (often excluding returns, sales tax and gift card sales) and how often percentage rent is reported and paid. Retail occupancy costs above about 10–12% of sales are often hard to sustain.",
    faq: [
      { question: "What is percentage rent?", answer: "Extra rent a retail tenant pays as a percentage of sales above a breakpoint, on top of base rent." },
      { question: "How do you calculate a natural breakpoint?", answer: "Divide the yearly base rent by the percentage rate — $60,000 ÷ 6% = $1,000,000." },
    ],
  },
  {
    slug: "tenant-improvement-allowance-calculator",
    title: "Tenant Improvement Allowance Calculator",
    category: COMMERCIAL,
    description: "Compare a landlord's tenant improvement (TI) allowance with your build-out cost — the allowance, any shortfall you pay up front, or the extra rent if the excess is amortized over the lease.",
    metaTitle: "Tenant Improvement Allowance Calculator — TI Allowance",
    metaDescription: "Free TI allowance calculator. Compare the tenant improvement allowance with build-out costs and see the out-of-pocket or amortized extra rent.",
    calcInputs: [
      numberField("squareFeet", "Leased Square Feet", { default: 3000, min: 100, max: 1000000 }),
      currencyField("allowancePerSqFt", "TI Allowance per Sq Ft", { default: 40, max: 500 }),
      currencyField("buildoutCostPerSqFt", "Build-Out Cost per Sq Ft", { default: 65, max: 1000 }),
      currencyField("otherCosts", "Other Costs (Design, Permits, Cabling)", { default: 0, max: 10000000, step: 500, required: false }),
      YN("amortizeExcess", "Landlord Amortizes the Excess into Rent", 1),
      percentField("amortizationRate", "Amortization Interest Rate", { default: 8, max: 15, step: 0.25 }),
      numberField("leaseYears", "Lease Term (Years)", { default: 7, min: 1, max: 30 }),
    ],
    calcResult: { label: "Tenant Out of Pocket", format: "currency" },
    calcResults: [
      { key: "tenantOutOfPocket", label: "Tenant Pays Up Front", format: "currency", highlight: true },
      { key: "totalAllowance", label: "Total TI Allowance", format: "currency" },
      { key: "totalBuildoutCost", label: "Total Build-Out Cost", format: "currency" },
      { key: "excessOverAllowance", label: "Cost Over the Allowance", format: "currency" },
      { key: "addedRentPerMonth", label: "Added Rent per Month (If Amortized)", format: "currency" },
      { key: "addedRentPerSqFtYear", label: "Added Rent per Sq Ft per Year", format: "currency" },
      { key: "unusedAllowance", label: "Unused Allowance", format: "currency" },
    ],
    instructions: "Enter the space size, the landlord's TI allowance per square foot and your contractor's build-out estimate. Choose whether the landlord will fund the excess and add it to rent, and the interest rate and term for that.",
    examples: `Example: a 3,000 sq ft space with a $40/sq ft allowance ($120,000) and a $65/sq ft build-out ($195,000) is $75,000 short. Amortized at 8% over a 7-year lease, that adds ${money(ex.ti.addedRentPerMonth)} a month — about ${money(ex.ti.addedRentPerSqFtYear)} per sq ft per year.`,
    assumptions: "Allowances vary by market, property type and lease length — longer leases and creditworthy tenants get more. Unused allowance is often forfeited unless the lease allows it as free rent or for furniture and cabling. Who owns the improvements at lease end is set by the lease.",
    faq: [
      { question: "What is a tenant improvement allowance?", answer: "Money the landlord contributes toward building out a commercial space for a new tenant, usually quoted per square foot." },
      { question: "What is a typical TI allowance?", answer: "From $10–$20/sq ft for second-generation space to $50–$150+/sq ft for new office build-outs on long leases." },
    ],
  },
  {
    slug: "lease-vs-buy-commercial-property-calculator",
    title: "Lease vs Buy Commercial Property Calculator",
    category: COMMERCIAL,
    description: "Decide whether your business should lease or buy its building — total lease cost with escalations and NNN vs the net cost of owning after interest, operating costs, appreciation, selling costs and the return your down payment could earn.",
    metaTitle: "Lease vs Buy Commercial Property Calculator",
    metaDescription: "Free lease vs buy commercial property calculator. Compare total lease cost with the net cost of owning your business's building.",
    calcInputs: [
      numberField("squareFeet", "Square Feet", { default: 5000, min: 100, max: 1000000 }),
      currencyField("leaseRentPerSqFt", "Lease Base Rent per Sq Ft per Year", { default: 22, max: 500, step: 0.5 }),
      currencyField("nnnPerSqFt", "NNN Charges per Sq Ft per Year", { default: 8, max: 200, step: 0.5 }),
      percentField("rentEscalation", "Yearly Rent Escalation", { default: 3, max: 10, step: 0.25 }),
      numberField("years", "Years to Compare", { default: 10, min: 1, max: 30 }),
      currencyField("purchasePrice", "Purchase Price", { default: 2000000, max: 500000000, step: 1000 }),
      percentField("downPaymentPercent", "Down Payment (SBA 504 Can Be 10%)", { default: 25, max: 100, step: 1 }),
      percentField("interestRate", "Loan Rate", { default: 7, max: 15, step: 0.125 }),
      numberField("loanTerm", "Amortization (Years)", { default: 25, min: 5, max: 30 }),
      percentField("closingCostPercent", "Closing Costs", { default: 3, max: 10, step: 0.25 }),
      percentField("ownershipCostPercent", "Tax, Insurance & Maintenance (% of Price per Year)", { default: 3, max: 10, step: 0.25 }),
      percentField("appreciationRate", "Property Appreciation per Year", { default: 3, max: 10, step: 0.25 }),
      percentField("sellingCostPercent", "Selling Costs", { default: 5, max: 10, step: 0.5 }),
      percentField("opportunityRate", "Return Your Cash Could Earn Instead", { default: 6, max: 15, step: 0.25 }),
    ],
    calcResult: { label: "Buying Saves", format: "currency" },
    calcResults: [
      { key: "buyingSaves", label: "Buying Saves (Negative = Lease Wins)", format: "currency", highlight: true },
      { key: "totalLeaseCost", label: "Total Lease Cost", format: "currency" },
      { key: "netCostOfOwning", label: "Net Cost of Owning", format: "currency" },
      { key: "monthlyLoanPayment", label: "Monthly Loan Payment", format: "currency" },
      { key: "equityAtEnd", label: "Equity at the End", format: "currency" },
      { key: "yearOneLeasePerMonth", label: "Year 1 Lease Cost per Month", format: "currency" },
    ],
    instructions: "Enter the space you need and the lease terms you've been offered, then the price and financing for a building you could buy, its yearly operating costs, expected appreciation, and the return your cash would earn otherwise.",
    examples: `Example: leasing 5,000 sq ft at $22 + $8 NNN, rising 3% a year, costs ${round(ex.lvb.totalLeaseCost)} over 10 years. Buying a $2,000,000 building with 25% down at 7% costs about ${round(ex.lvb.netCostOfOwning)} net after appreciation and the lost return on your down payment — buying ${ex.lvb.buyingSaves >= 0 ? "saves" : "costs"} about ${round(Math.abs(ex.lvb.buyingSaves))}.`,
    assumptions: "Net cost of owning = interest + operating costs + closing and selling costs + the return your down payment could have earned − appreciation. Principal paid is equity you keep, so it isn't a cost. Income tax effects (depreciation, interest deductions) and the flexibility of leasing aren't valued here. SBA 504 loans allow owner-occupiers as little as 10% down.",
    faq: [
      { question: "Is it better to lease or buy commercial property?", answer: "Buying usually wins for stable businesses staying 7–10+ years in an appreciating market; leasing keeps cash free and flexibility high." },
      { question: "Can I buy a building with an SBA loan?", answer: "Yes — SBA 504 and 7(a) loans finance owner-occupied commercial property with as little as 10% down." },
    ],
  },
  {
    slug: "warehouse-lease-calculator",
    title: "Warehouse Lease Calculator",
    category: COMMERCIAL,
    description: "Calculate the cost of leasing warehouse or industrial space — base rent per square foot with escalations, NNN charges, free rent, utilities and TI — over the term, as an effective rent and per pallet position.",
    metaTitle: "Warehouse Lease Calculator — Industrial Lease Cost",
    metaDescription: "Free warehouse lease calculator. Calculate industrial lease cost with escalations, NNN, free rent and utilities, effective rent and cost per pallet.",
    calcInputs: [
      numberField("squareFeet", "Warehouse Square Feet", { default: 20000, min: 500, max: 5000000 }),
      currencyField("baseRentPerSqFt", "Base Rent per Sq Ft per Year", { default: 9, max: 100, step: 0.05 }),
      currencyField("nnnPerSqFt", "NNN per Sq Ft per Year", { default: 2.5, max: 50, step: 0.05 }),
      percentField("annualEscalation", "Yearly Escalation", { default: 3.5, max: 10, step: 0.25 }),
      numberField("termYears", "Lease Term (Years)", { default: 5, min: 1, max: 25 }),
      numberField("freeRentMonths", "Free Rent (Months)", { default: 3, max: 24, required: false }),
      currencyField("monthlyUtilities", "Monthly Utilities", { default: 1500, max: 200000, required: false }),
      currencyField("tiAllowance", "TI Allowance / Landlord Work Value", { default: 0, max: 10000000, step: 500, required: false }),
      numberField("palletPositions", "Pallet Positions (Optional)", { default: 2400, max: 1000000, required: false }),
    ],
    calcResult: { label: "Total Lease Cost", format: "currency" },
    calcResults: [
      { key: "totalLeaseCost", label: "Total Lease Cost over the Term", format: "currency", highlight: true },
      { key: "yearOneMonthlyCost", label: "Year 1 Monthly Cost", format: "currency" },
      { key: "effectiveRentPerSqFtYear", label: "Effective Cost per Sq Ft per Year", format: "currency" },
      { key: "freeRentValue", label: "Value of Free Rent", format: "currency" },
      { key: "costPerPalletPerMonth", label: "Cost per Pallet Position per Month", format: "currency" },
    ],
    instructions: "Enter the space, base rent and NNN charges per square foot per year, the escalation and term, any free rent and your monthly utilities. Add the number of pallet positions to compare with third-party logistics (3PL) storage pricing.",
    examples: `Example: 20,000 sq ft at $9.00 + $2.50 NNN, rising 3.5% a year over 5 years with 3 months free and $1,500 of utilities, costs ${round(ex.wh.totalLeaseCost)} — ${money(ex.wh.effectiveRentPerSqFtYear)} per sq ft per year effective, or ${money(ex.wh.costPerPalletPerMonth)} per pallet position per month.`,
    assumptions: "Industrial leases are usually NNN with yearly escalations of 3–5%. Free rent is applied to base rent only. Clear height, dock doors, power and trailer parking drive rent as much as location. 3PL storage often runs $15–$30 per pallet per month for comparison.",
    faq: [
      { question: "How much does it cost to lease a warehouse?", answer: "US industrial asking rents average roughly $8–$12 per sq ft per year plus NNN, much higher in coastal port markets." },
      { question: "What is NNN in a warehouse lease?", answer: "The tenant's share of property taxes, insurance and common area maintenance, paid on top of base rent." },
    ],
  },
  {
    slug: "nnn-rent-calculator",
    title: "NNN Rent Calculator",
    category: COMMERCIAL,
    description: "Calculate triple net (NNN) rent from the building's actual expenses — your pro-rata share of property taxes, insurance and CAM (with the landlord's admin fee), plus base rent — monthly and per square foot.",
    metaTitle: "NNN Rent Calculator — Triple Net Lease Charges",
    metaDescription: "Free NNN rent calculator. Calculate your pro-rata share of taxes, insurance and CAM, total triple net rent and the gross-equivalent rent.",
    calcInputs: [
      numberField("tenantSqFt", "Your Leased Square Feet", { default: 2500, min: 1, max: 1000000 }),
      numberField("buildingSqFt", "Building / Center Rentable Square Feet", { default: 20000, min: 1, max: 10000000 }),
      currencyField("baseRentPerSqFt", "Base Rent per Sq Ft per Year", { default: 24, max: 500, step: 0.25 }),
      currencyField("buildingTaxes", "Building Property Taxes per Year", { default: 90000, max: 100000000, step: 100 }),
      currencyField("buildingInsurance", "Building Insurance per Year", { default: 30000, max: 50000000, step: 100 }),
      currencyField("buildingCam", "Building CAM per Year", { default: 60000, max: 50000000, step: 100 }),
      percentField("adminFeePercent", "Landlord Admin Fee on CAM", { default: 10, max: 20, step: 1, required: false }),
    ],
    calcResult: { label: "Monthly Total Rent", format: "currency" },
    calcResults: [
      { key: "monthlyTotalRent", label: "Monthly Total Rent (Base + NNN)", format: "currency", highlight: true },
      { key: "yearlyNnnCharges", label: "Your Yearly NNN Charges", format: "currency" },
      { key: "nnnPerSqFtYear", label: "NNN per Sq Ft per Year", format: "currency" },
      { key: "proRataShare", label: "Your Pro-Rata Share", format: "percentage" },
      { key: "monthlyBaseRent", label: "Monthly Base Rent", format: "currency" },
      { key: "grossEquivalentPerSqFt", label: "Gross-Equivalent Rent per Sq Ft", format: "currency" },
    ],
    instructions: "Enter your square footage and the building's rentable area, your base rent, and the building's yearly tax, insurance and CAM budgets from the landlord's reconciliation. Add the admin or management fee the lease allows on CAM.",
    examples: "Example: 2,500 sq ft in a 20,000 sq ft center is a 12.5% share. With $90,000 of taxes, $30,000 of insurance and $60,000 of CAM plus a 10% admin fee, your NNN is $23,250 a year ($9.30/sq ft). With $24 base rent, you pay $6,937.50 a month — $33.30 per sq ft gross-equivalent.",
    assumptions: "Pro-rata share = your square feet ÷ the building's rentable square feet (some leases use occupied area or gross-ups for vacancy). CAM can include management, repairs, landscaping, snow removal and security; leases often cap controllable CAM increases. NNN is billed monthly on estimates and reconciled each year.",
    faq: [
      { question: "How is NNN calculated?", answer: "Add the building's taxes, insurance and CAM, then multiply by your share of the building's square footage." },
      { question: "What is a good NNN rate?", answer: "It depends on the property: often $3–$8/sq ft for industrial, $6–$15 for retail centers and more in high-tax areas." },
    ],
  },
  {
    slug: "defeasance-calculator",
    title: "Defeasance Calculator",
    category: COMMERCIAL,
    description: "Estimate the cost to defease a commercial (CMBS) loan before maturity — the Treasury portfolio needed to replace the remaining payments and balloon, the premium over your balance and the transaction fees.",
    metaTitle: "Defeasance Calculator — CMBS Loan Defeasance Cost",
    metaDescription: "Free defeasance calculator. Estimate the securities cost, premium and fees to defease a CMBS commercial loan before maturity.",
    calcInputs: [
      currencyField("loanBalance", "Current Loan Balance", { default: 5000000, max: 2000000000, step: 10000 }),
      percentField("noteRate", "Note Rate", { default: 4.5, max: 15, step: 0.01 }),
      numberField("monthsToMaturity", "Months to Maturity (or Open Date)", { default: 48, min: 1, max: 360 }),
      numberField("amortizationYears", "Amortization (Years)", { default: 30, min: 1, max: 40 }),
      YN("interestOnly", "Interest-Only for the Rest of the Term", 0),
      percentField("treasuryYield", "Treasury Yield for the Remaining Term", { default: 3.9, max: 10, step: 0.01 }),
      currencyField("transactionFees", "Fees (Legal, Accountant, Successor Borrower, Servicer)", { default: 75000, max: 2000000, step: 1000 }),
    ],
    calcResult: { label: "Total Defeasance Cost", format: "currency" },
    calcResults: [
      { key: "totalDefeasanceCost", label: "Total Defeasance Cost", format: "currency", highlight: true },
      { key: "securitiesPortfolioCost", label: "Treasury Securities Portfolio", format: "currency" },
      { key: "defeasancePremium", label: "Premium over the Balance", format: "currency" },
      { key: "transactionFees", label: "Transaction Fees", format: "currency" },
      { key: "costAsPercentOfBalance", label: "Cost as % of Balance", format: "percentage" },
      { key: "balloonAtMaturity", label: "Balloon at Maturity", format: "currency" },
    ],
    instructions: "Enter the loan balance, note rate, months until maturity (or the open prepayment date) and the amortization. Enter the Treasury yield matching the remaining term and your estimate of transaction fees.",
    examples: `Example: a $5,000,000 loan at 4.5% with 48 months left needs a Treasury portfolio of about ${round(ex.def.securitiesPortfolioCost)} at a 3.9% yield — a ${round(ex.def.defeasancePremium)} premium. With $75,000 of fees, defeasance costs about ${round(ex.def.totalDefeasanceCost)} (${ex.def.costAsPercentOfBalance}% of the balance).`,
    assumptions: "Defeasance replaces the loan's collateral with Treasury securities whose cash flows match every remaining payment and the balloon; the cost falls when Treasury yields are above the note rate and rises when they're below. This is an estimate using one flat yield, not a yield curve or a provider's quote. Some loans use yield maintenance instead.",
    faq: [
      { question: "What is loan defeasance?", answer: "A way to release a CMBS loan's collateral early by buying Treasury securities that make the remaining payments in its place." },
      { question: "How much does defeasance cost?", answer: "It depends mainly on the gap between the note rate and current Treasury yields and the time left — plus about $50,000–$100,000 of fees." },
    ],
  },
];

async function main() {
  const categoryIds = new Map<string, string>();
  for (const slug of new Set(TOOLS.map((t) => t.category))) {
    const c = await prisma.toolCategory.findUnique({ where: { slug } });
    if (!c) throw new Error(`The "${slug}" category doesn't exist — run "npx tsx prisma/restructure-real-estate-main-category.ts --apply" first.`);
    categoryIds.set(slug, c.id);
  }

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: categoryIds.get(def.category)!,
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
