// One-time (but safe to re-run) batch setup script: creates the Car Care & Upgrades tools
// (14) of the Car & Vehicle Cost Calculators expansion, filed under Car & Vehicle
// Cost Calculators > Car Maintenance, Repair & Upgrade Calculators (both categories are created on first run).
// See src/lib/calc-engine-car-care-upgrades.ts for the math and
// src/lib/calc-engine-car-buying.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-car-care-upgrades-calculators.ts
// or
//   npm run db:create-car-care-upgrades-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Car & Vehicle Cost Calculators", slug: "car-vehicle-cost-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Car Maintenance, Repair & Upgrade Calculators", slug: "car-maintenance-repair-upgrade-calculators" };

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function currencyField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "currency",
    unit: opts.unit,
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: 0,
    max: opts.max ?? 100000000,
    step: opts.step ?? 100,
  };
}

function percentField(
  key: string,
  label: string,
  opts: { required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "percentage",
    unit: "%",
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: opts.min ?? 0,
    max: opts.max ?? 100,
    step: opts.step ?? 0.1,
  };
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
    max: opts.max ?? 1000000,
    step: opts.step ?? 1,
  };
}

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't financial, tax or legal " +
  "advice. Prices, fees, taxes and rates vary by vehicle, dealer, location and provider — check current " +
  "quotes and your state or local rules for exact figures.";

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; currency?: string };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const TOOLS: ToolDef[] = [
  {
    slug: "car-inspection-cost-calculator",
    title: "Car Inspection Cost Calculator",
    description: "Estimate the yearly cost of state car safety inspections and emissions tests, including the expected cost of failing — retests and repairs to pass.",
    metaTitle: "Car Inspection Cost Calculator — Safety & Emissions Test",
    metaDescription: "Free car inspection cost calculator. Estimate safety inspection and emissions test fees plus expected retest and repair costs.",
    calcInputs: [
      currencyField("safetyFee", "Safety Inspection Fee", { default: 25, max: 500, step: 1 }),
      currencyField("emissionsFee", "Emissions (Smog) Test Fee", { default: 30, max: 500, step: 1 }),
      numberField("everyYears", "Required Every (Years)", { default: 1, min: 1, max: 5, step: 1 }),
      percentField("failChancePercent", "Chance of Failing", { default: 15, max: 100, step: 1 }),
      currencyField("retestFee", "Retest Fee", { default: 20, max: 500, step: 1, required: false }),
      currencyField("repairsToPass", "Typical Repairs to Pass", { default: 200, max: 10000, step: 25 }),
      numberField("years", "Years", { default: 5, min: 1, max: 30, step: 1 }),
    ],
    calcResult: { label: "Yearly Cost", format: "currency" },
    calcResults: [
      { key: "costPerInspection", label: "Cost per Inspection", format: "currency" },
      { key: "expectedRetestAndRepairs", label: "Expected Retest & Repairs", format: "currency" },
      { key: "yearlyCost", label: "Yearly Cost", format: "currency", highlight: true },
      { key: "totalOverYears", label: "Total over the Years", format: "currency" },
    ],
    instructions:
      "Requirements vary widely: some states require yearly safety inspections, some only emissions (smog) tests every " +
      "one or two years, and many require neither. Fees are often capped by the state. Older cars are more likely to " +
      "fail and need repairs before passing.\n\n" +
      "Leave a fee at 0 if your state doesn't require that test.",
    examples:
      "Example: a $25 safety inspection and $30 emissions test each year, with a 15% chance of needing " +
      "repairs, costs about $88 a year — $440 over 5 years.",
    assumptions:
      "One retest after a failure. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are new cars exempt from emissions tests?",
        answer: "Many states exempt new cars for their first several model years and some exempt EVs entirely.",
      },
    ],
  },
  {
    slug: "winter-driving-prep-cost-calculator",
    title: "Winter Driving Prep Cost Calculator",
    description: "Estimate the yearly cost of getting your car ready for winter — winter tires on separate wheels or remounted each season, tire storage and other prep — less any insurance discount.",
    metaTitle: "Winter Driving Prep Cost Calculator — Winter Tire Swap",
    metaDescription: "Free winter car prep calculator. Estimate winter tire, wheel, swap and storage costs plus other winter prep per year.",
    calcInputs: [
      currencyField("winterTireSet", "Set of Winter Tires", { default: 800, max: 10000, step: 50 }),
      {
        key: "separateWheels", label: "Winter Tires on Their Own Wheels?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes", value: 1 },
          { label: "No — Remount Each Season", value: 0 },
        ],
      },
      currencyField("wheelsCost", "Set of Winter Wheels", { default: 500, max: 10000, step: 50 }),
      numberField("seasons", "Winters the Tires Will Last", { default: 4, min: 1, max: 10, step: 1 }),
      currencyField("swapCostOnWheels", "Swap Cost (Tires on Wheels)", { default: 50, max: 500, step: 5 }),
      currencyField("swapCostRemount", "Swap Cost (Remount & Balance)", { default: 120, max: 500, step: 5 }),
      currencyField("storagePerSeason", "Tire Storage per Year", { default: 0, max: 500, step: 5, required: false }),
      currencyField("otherPrep", "Other Prep (Wipers, Fluid, Battery Check, Kit)", { default: 120, max: 2000, step: 10 }),
      currencyField("insurancePremium", "Yearly Car Insurance Premium", { default: 1800, max: 20000, step: 50 }),
      percentField("insuranceDiscountPercent", "Winter Tire Insurance Discount", { default: 0, max: 20, step: 1, required: false }),
    ],
    calcResult: { label: "Yearly Cost", format: "currency" },
    calcResults: [
      { key: "upfrontCost", label: "Upfront Cost", format: "currency" },
      { key: "swapsPerYear", label: "Swaps per Year", format: "currency" },
      { key: "insuranceSavings", label: "Insurance Savings per Year", format: "currency" },
      { key: "yearlyCost", label: "Yearly Cost", format: "currency", highlight: true },
      { key: "totalOverSeasons", label: "Total over the Winters", format: "currency" },
    ],
    instructions:
      "Winter tires grip far better on snow, ice and cold pavement than all-season tires. Mounting them on a second set " +
      "of wheels costs more up front but makes each swap cheap and quick. While your winter tires are on, your regular " +
      "tires aren't wearing — so part of the cost comes back.\n\n" +
      "Some insurers give a winter tire discount (Ontario insurers must offer one). Add wipers, washer fluid, a battery " +
      "test and an emergency kit.",
    examples:
      "Example: $800 winter tires on $500 wheels lasting 4 winters, with two swaps a year and other prep, cost " +
      "about $545 a year.",
    assumptions:
      "Two swaps a year; wear saved on regular tires not counted. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are all-weather tires a good alternative?",
        answer: "All-weather tires (with the mountain-snowflake symbol) can stay on year-round in moderate winters, avoiding swaps.",
      },
    ],
  },
  {
    slug: "headlight-restoration-cost-calculator",
    title: "Headlight Restoration Cost Calculator",
    description: "Compare restoring cloudy headlights yourself, paying a pro, or replacing them, by cost per year of clear lights.",
    metaTitle: "Headlight Restoration Cost Calculator — DIY vs Pro vs New",
    metaDescription: "Free headlight restoration calculator. Compare a DIY kit, professional restoration and new headlights by cost per year.",
    calcInputs: [
      currencyField("diyKitCost", "DIY Restoration Kit", { default: 25, max: 200, step: 1 }),
      numberField("diyLifeYears", "DIY Result Lasts (Years)", { default: 1, min: 0.25, max: 5, step: 0.25 }),
      currencyField("proCost", "Professional Restoration", { default: 120, max: 1000, step: 5 }),
      numberField("proLifeYears", "Pro Result Lasts (Years)", { default: 2, min: 0.25, max: 10, step: 0.25 }),
      currencyField("replacementPerHeadlight", "New Headlight Assembly (Each, Installed)", { default: 300, max: 5000, step: 10 }),
      numberField("headlights", "Number of Headlights", { default: 2, min: 1, max: 4, step: 1 }),
      numberField("replacementLifeYears", "New Headlights Last (Years)", { default: 8, min: 1, max: 20, step: 1 }),
    ],
    calcResult: { label: "Cheapest per Year", format: "currency" },
    calcResults: [
      { key: "diyPerYear", label: "DIY per Year", format: "currency" },
      { key: "professionalPerYear", label: "Professional per Year", format: "currency" },
      { key: "replacementTotal", label: "Replacement Cost", format: "currency" },
      { key: "replacementPerYear", label: "Replacement per Year", format: "currency" },
      { key: "cheapestPerYear", label: "Cheapest per Year", format: "currency", highlight: true },
    ],
    instructions:
      "Plastic headlight lenses yellow and haze from UV exposure, cutting light output and sometimes failing inspection. " +
      "Sanding and polishing restores them; a UV-protective sealant afterward makes the result last much longer.\n\n" +
      "If the haze is inside the lens or the housing is cracked, replacement is the only fix.",
    examples:
      "Example: a $25 DIY kit works out to $25 a year, a pro restoration $60 and new headlights " +
      "$75 a year.",
    assumptions:
      "Your time for DIY isn't counted. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does toothpaste work on headlights?",
        answer: "It can briefly improve mild haze, but without a UV sealant the yellowing returns quickly.",
      },
    ],
  },
  {
    slug: "car-detailing-cost-calculator",
    title: "Car Detailing Cost Calculator",
    description: "Estimate car detailing costs by package and vehicle size, your yearly spend, and how much you'd save doing it yourself.",
    metaTitle: "Car Detailing Cost Calculator — Price by Package & Size",
    metaDescription: "Free car detailing cost calculator. Estimate detailing prices by package and vehicle size, and yearly DIY savings.",
    calcInputs: [
      {
        key: "pkg", label: "Detailing Package", type: "dropdown", required: true, default: 2,
        options: [
          { label: "Basic Wash & Vacuum", value: 1 },
          { label: "Full Interior & Exterior Detail", value: 2 },
          { label: "Premium (incl. Paint Correction)", value: 3 },
        ],
      },
      {
        key: "vehicleSize", label: "Vehicle Size", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Car", value: 1 },
          { label: "SUV or Pickup", value: 2 },
          { label: "Large Van or 3-Row SUV", value: 3 },
        ],
      },
      numberField("timesPerYear", "Details per Year", { default: 4, min: 0, max: 52, step: 1 }),
      currencyField("addOns", "Add-Ons per Detail (Pet Hair, Odor, Engine Bay)", { default: 0, max: 1000, step: 5, required: false }),
      currencyField("diySuppliesYearly", "DIY Supplies per Year", { default: 120, max: 2000, step: 10 }),
    ],
    calcResult: { label: "Yearly Cost", format: "currency" },
    calcResults: [
      { key: "costPerDetail", label: "Cost per Detail", format: "currency" },
      { key: "yearlyCost", label: "Yearly Cost", format: "currency", highlight: true },
      { key: "diyYearlyCost", label: "DIY Supplies per Year", format: "currency" },
      { key: "savingsDoingItYourself", label: "Savings Doing It Yourself", format: "currency" },
    ],
    instructions:
      "Detailing goes beyond a wash: deep interior cleaning, shampooing, clay bar and wax or sealant, and sometimes paint " +
      "correction to remove swirls. Larger vehicles cost more, and mobile detailers may add a travel fee.\n\n" +
      "A full detail before selling a car often pays for itself in a higher sale price.",
    examples:
      "Example: a full detail on a car costs about $200; 4 a year is $800, versus $120 of supplies " +
      "if you do it yourself.",
    assumptions:
      "Typical package prices for a car: basic $50, full $200, premium $500. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How often should I detail my car?",
        answer: "A full detail two to four times a year, with regular washes in between, keeps most cars in good shape.",
      },
    ],
  },
  {
    slug: "car-wash-subscription-calculator",
    title: "Car Wash Subscription Calculator",
    description: "Find out if an unlimited car wash membership is worth it by comparing the monthly plan with paying for each wash.",
    metaTitle: "Car Wash Subscription Calculator — Is Unlimited Worth It",
    metaDescription: "Free car wash membership calculator. Compare an unlimited wash plan with paying per wash and find the break-even.",
    calcInputs: [
      currencyField("monthlyPlan", "Unlimited Plan per Month", { default: 30, max: 500, step: 1 }),
      currencyField("singleWashPrice", "Price of a Single Wash", { default: 15, max: 200, step: 1 }),
      numberField("washesPerMonth", "Washes per Month", { default: 3, min: 0, max: 31, step: 1 }),
    ],
    calcResult: { label: "Yearly Savings", format: "currency" },
    calcResults: [
      { key: "payPerWashMonthly", label: "Paying per Wash (Monthly)", format: "currency" },
      { key: "subscriptionMonthly", label: "Subscription (Monthly)", format: "currency" },
      { key: "monthlySavings", label: "Monthly Savings", format: "currency" },
      { key: "yearlySavings", label: "Yearly Savings", format: "currency", highlight: true },
      { key: "breakEvenWashesPerMonth", label: "Washes per Month to Break Even", format: "number" },
      { key: "costPerWashOnPlan", label: "Cost per Wash on the Plan", format: "currency" },
    ],
    instructions:
      "Unlimited wash plans pay off if you wash more than the break-even number of times a month — easy in winter salt " +
      "or pollen season, harder in dry months. Most plans auto-renew, so cancel if your washing slows down.\n\n" +
      "A negative savings figure means paying per wash is cheaper.",
    examples:
      "Example: 3 washes a month at $15 cost $45, versus a $30 plan — $180 saved a year. " +
      "The plan pays off at 2 washes a month.",
    assumptions:
      "Same wash level on both. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do automatic car washes damage paint?",
        answer: "Well-maintained soft-cloth and touchless washes are generally safe; older brush washes can cause swirl marks.",
      },
    ],
  },
  {
    slug: "car-wrap-cost-calculator",
    title: "Car Wrap Cost Calculator",
    description: "Estimate the cost of a vinyl car wrap by vehicle size, coverage and finish, its cost per year, and how it compares with a quality paint job.",
    metaTitle: "Car Wrap Cost Calculator — Vinyl Wrap Price",
    metaDescription: "Free car wrap cost calculator. Estimate full or partial vinyl wrap cost by vehicle size and finish, versus a paint job.",
    calcInputs: [
      {
        key: "vehicleSize", label: "Vehicle Size", type: "dropdown", required: true, default: 2,
        options: [
          { label: "Compact Car", value: 1 },
          { label: "Sedan", value: 2 },
          { label: "SUV or Pickup", value: 3 },
          { label: "Van", value: 4 },
        ],
      },
      {
        key: "coverage", label: "Coverage", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Full Wrap", value: 1 },
          { label: "Partial Wrap", value: 2 },
          { label: "Roof, Hood or Accents", value: 3 },
        ],
      },
      {
        key: "finish", label: "Finish", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Gloss or Matte", value: 1 },
          { label: "Satin or Textured", value: 2 },
          { label: "Chrome or Color-Shift", value: 3 },
        ],
      },
      currencyField("designFee", "Design / Printing Fee (Graphics)", { default: 0, max: 10000, step: 50, required: false }),
      numberField("lifeYears", "Wrap Life (Years)", { default: 5, min: 1, max: 10, step: 1 }),
      currencyField("paintJobCost", "Quality Paint Job Cost", { default: 5000, max: 50000, step: 250 }),
    ],
    calcResult: { label: "Wrap Cost", format: "currency" },
    calcResults: [
      { key: "wrapCost", label: "Wrap Cost", format: "currency", highlight: true },
      { key: "costPerYear", label: "Cost per Year", format: "currency" },
      { key: "savingsVsPaintJob", label: "Savings vs a Paint Job", format: "currency" },
    ],
    instructions:
      "A professional vinyl wrap changes your car's color or adds graphics, protects the original paint and can be " +
      "removed later. Quality wraps last about 5–7 years. Price depends on vehicle size, how much is covered, the film " +
      "and finish, and the complexity of the body shape.\n\n" +
      "Wraps won't hide dents or peeling paint — the surface must be in good condition first.",
    examples:
      "Example: a full gloss wrap on a sedan costs about $3,000 — $600 a year over 5 years, and $2,000 " +
      "less than a $5,000 paint job.",
    assumptions:
      "Typical full-wrap prices: compact $2,500, sedan $3,000, SUV/pickup $3,800, van $4,500. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I need to tell the DMV about a color change?",
        answer: "Some states require you to update the vehicle's color on your registration after a full wrap — check your DMV.",
      },
    ],
  },
  {
    slug: "ceramic-coating-cost-calculator",
    title: "Ceramic Coating Cost Calculator",
    description: "Compare a professional ceramic coating with a DIY coating and regular waxing by cost per year of paint protection.",
    metaTitle: "Ceramic Coating Cost Calculator — Pro vs DIY vs Wax",
    metaDescription: "Free ceramic coating cost calculator. Compare professional and DIY ceramic coating with regular waxing per year.",
    calcInputs: [
      currencyField("proCoatingCost", "Professional Coating (incl. Paint Prep)", { default: 1200, max: 10000, step: 50 }),
      numberField("coatingLifeYears", "Pro Coating Life (Years)", { default: 5, min: 0.5, max: 10, step: 0.5 }),
      currencyField("diyCoatingCost", "DIY Coating Kit", { default: 100, max: 1000, step: 5 }),
      numberField("diyLifeYears", "DIY Coating Life (Years)", { default: 1, min: 0.25, max: 5, step: 0.25 }),
      currencyField("waxPrice", "Professional Wax per Application", { default: 75, max: 500, step: 5 }),
      numberField("waxesPerYear", "Waxes per Year", { default: 4, min: 0, max: 12, step: 1 }),
    ],
    calcResult: { label: "Pro Coating per Year", format: "currency" },
    calcResults: [
      { key: "proCoatingPerYear", label: "Pro Coating per Year", format: "currency", highlight: true },
      { key: "diyCoatingPerYear", label: "DIY Coating per Year", format: "currency" },
      { key: "waxingPerYear", label: "Waxing per Year", format: "currency" },
      { key: "savingsVsWaxing", label: "Pro Coating Savings vs Waxing", format: "currency" },
    ],
    instructions:
      "Ceramic coatings bond to the paint and resist UV, chemicals and dirt for years, making washing easier. They don't " +
      "stop rock chips — that's what paint protection film is for. Professional installs include paint correction, which " +
      "is much of the cost.\n\n" +
      "Waxes and sealants are cheaper per application but last weeks to months.",
    examples:
      "Example: a $1,200 coating lasting 5 years costs $240 a year, versus $300 for " +
      "professional waxing 4 times a year.",
    assumptions:
      "Your time for DIY isn't counted. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I wax over a ceramic coating?",
        answer: "It isn't needed and can mask the coating's water-beading; use a ceramic-safe topper instead.",
      },
    ],
  },
  {
    slug: "paint-protection-film-cost-calculator",
    title: "Paint Protection Film Cost Calculator",
    description: "Estimate paint protection film (PPF, clear bra) cost by coverage and vehicle, its cost per year, and the chip repairs it can save.",
    metaTitle: "Paint Protection Film Cost Calculator — Clear Bra Price",
    metaDescription: "Free PPF cost calculator. Estimate clear bra cost for partial front, full front or full car coverage and its value.",
    calcInputs: [
      {
        key: "coverage", label: "Coverage", type: "dropdown", required: true, default: 2,
        options: [
          { label: "Partial Front (Bumper, Partial Hood, Mirrors)", value: 1 },
          { label: "Full Front", value: 2 },
          { label: "Track Pack (Full Front + Rockers)", value: 3 },
          { label: "Full Car", value: 4 },
        ],
      },
      {
        key: "vehicle", label: "Vehicle", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Car", value: 1 },
          { label: "SUV or Pickup", value: 2 },
          { label: "Exotic / Complex Body", value: 3 },
        ],
      },
      currencyField("quote", "Your Quote (0 = Typical)", { default: 0, max: 20000, step: 100, required: false }),
      numberField("lifeYears", "Film Life (Years)", { default: 10, min: 1, max: 15, step: 1 }),
      currencyField("avoidedRepairsPerYear", "Chip & Paint Repairs Avoided per Year", { default: 150, max: 5000, step: 25 }),
    ],
    calcResult: { label: "PPF Cost", format: "currency" },
    calcResults: [
      { key: "ppfCost", label: "PPF Cost", format: "currency", highlight: true },
      { key: "costPerYear", label: "Cost per Year", format: "currency" },
      { key: "avoidedRepairsOverLife", label: "Repairs Avoided over Its Life", format: "currency" },
      { key: "netCostOverLife", label: "Net Cost over Its Life", format: "currency" },
    ],
    instructions:
      "Paint protection film is a clear urethane layer that absorbs rock chips, scratches and bug damage. Most people " +
      "protect the high-impact front areas; full-car coverage costs much more. Quality films self-heal light scratches and " +
      "carry 10-year warranties.\n\n" +
      "PPF helps keep original paint perfect, which supports resale value on newer and high-end cars.",
    examples:
      "Example: full-front PPF on a car costs about $2,200 — $220 a year over 10 years.",
    assumptions:
      "Typical prices for a car: partial front $1,500, full front $2,200, track pack $3,000, full car $6,500. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "PPF or ceramic coating?",
        answer: "PPF protects against physical chips; ceramic coating adds gloss and easier cleaning. Many owners combine them.",
      },
    ],
  },
  {
    slug: "vehicle-undercoating-cost-calculator",
    title: "Vehicle Undercoating Cost Calculator",
    description: "Weigh the cost of undercoating or rust-proofing your vehicle over the years against the rust repairs it's likely to prevent.",
    metaTitle: "Vehicle Undercoating Cost Calculator — Rust-Proofing Value",
    metaDescription: "Free undercoating cost calculator. Compare rust-proofing costs over the years with the rust repairs they help prevent.",
    calcInputs: [
      currencyField("applicationCost", "Cost per Application", { default: 300, max: 5000, step: 10 }),
      numberField("reapplyEveryYears", "Reapply Every (Years)", { default: 5, min: 1, max: 20, step: 1 }),
      numberField("years", "Years You'll Keep the Vehicle", { default: 10, min: 1, max: 30, step: 1 }),
      currencyField("rustRepairCost", "Typical Rust Repair Cost", { default: 3000, max: 50000, step: 100 }),
      percentField("rustChanceWithoutPercent", "Chance of Rust Repair Without Coating", { default: 40, max: 100, step: 5 }),
      percentField("rustChanceWithPercent", "Chance of Rust Repair with Coating", { default: 10, max: 100, step: 5 }),
    ],
    calcResult: { label: "Net Benefit", format: "currency" },
    calcResults: [
      { key: "applications", label: "Applications Needed", format: "number" },
      { key: "totalCoatingCost", label: "Total Coating Cost", format: "currency" },
      { key: "expectedRustCostAvoided", label: "Expected Rust Repairs Avoided", format: "currency" },
      { key: "netBenefit", label: "Net Benefit", format: "currency", highlight: true },
    ],
    instructions:
      "In snowy states that salt the roads, rust attacks brake lines, frames and body panels. Undercoating comes as " +
      "one-time rubberized or wax coatings, or yearly oil-based sprays that creep into seams. Modern cars have better " +
      "factory protection, so the benefit is biggest for vehicles kept a long time in the salt belt.\n\n" +
      "A negative net benefit means the coating likely costs more than it saves — though rinsing the underbody in " +
      "winter helps either way.",
    examples:
      "Example: 2 applications at $300 over 10 years cost $600 and avoid about " +
      "$900 of expected rust repairs — a net benefit of $300.",
    assumptions:
      "One major rust repair at most. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can undercoating trap moisture?",
        answer: "Hard coatings applied over existing rust or with gaps can; oil-based sprays reapplied yearly avoid this.",
      },
    ],
  },
  {
    slug: "car-alarm-security-system-cost-calculator",
    title: "Car Alarm and Security System Cost Calculator",
    description: "Estimate the cost of a car alarm, immobilizer or GPS tracker — equipment, installation and monitoring — less the insurance discount it may earn.",
    metaTitle: "Car Alarm & Security System Cost Calculator",
    metaDescription: "Free car security system calculator. Estimate alarm or GPS tracker cost with installation and monitoring, less insurance savings.",
    calcInputs: [
      currencyField("equipmentCost", "Equipment (Alarm, Immobilizer, Tracker)", { default: 250, max: 5000, step: 10 }),
      currencyField("installation", "Installation", { default: 200, max: 2000, step: 10 }),
      currencyField("monitoringMonthly", "Monitoring / Tracker Subscription per Month", { default: 0, max: 100, step: 1, required: false }),
      numberField("years", "Years", { default: 5, min: 1, max: 20, step: 1 }),
      currencyField("comprehensivePremium", "Comprehensive Premium per Year", { default: 400, max: 10000, step: 25 }),
      percentField("insuranceDiscountPercent", "Anti-Theft Insurance Discount", { default: 10, max: 30, step: 1 }),
    ],
    calcResult: { label: "Net Cost over the Years", format: "currency" },
    calcResults: [
      { key: "upfrontCost", label: "Upfront Cost", format: "currency" },
      { key: "monitoringOverYears", label: "Monitoring over the Years", format: "currency" },
      { key: "insuranceSavingsOverYears", label: "Insurance Savings over the Years", format: "currency" },
      { key: "netCostOverYears", label: "Net Cost over the Years", format: "currency", highlight: true },
    ],
    instructions:
      "Aftermarket alarms deter break-ins, immobilizers stop the car being started without the key, and GPS trackers help " +
      "recover a stolen car. Insurers may discount the comprehensive part of your premium for anti-theft devices — " +
      "trackers usually earn the most.\n\n" +
      "Ask your insurer which devices qualify before you buy.",
    examples:
      "Example: a $450 security system earning a 10% discount on a $400 comprehensive " +
      "premium saves $200 over 5 years, for a net cost of $250.",
    assumptions:
      "Discount applies to the comprehensive premium only. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do car alarms actually prevent theft?",
        answer: "Audible alarms deter casual thieves; immobilizers and trackers are more effective against professional theft.",
      },
    ],
  },
  {
    slug: "aftermarket-car-parts-cost-calculator",
    title: "Aftermarket Car Parts Cost Calculator",
    description: "Compare aftermarket and OEM parts costs with labor and a contingency, and budget a car modification project including insurance changes and resale value.",
    metaTitle: "Aftermarket Car Parts Calculator — Mod Budget vs OEM",
    metaDescription: "Free aftermarket parts and car mod budget calculator. Compare aftermarket vs OEM costs with labor, contingency and insurance.",
    calcInputs: [
      currencyField("aftermarketParts", "Aftermarket Parts Total", { default: 2000, max: 1000000, step: 50 }),
      currencyField("oemParts", "OEM Parts Equivalent", { default: 2800, max: 1000000, step: 50 }),
      numberField("laborHours", "Labor Hours", { default: 6, min: 0, max: 500, step: 0.5 }),
      currencyField("laborRate", "Labor Rate per Hour", { default: 120, max: 500, step: 5 }),
      percentField("contingencyPercent", "Contingency", { default: 10, max: 50, step: 1 }),
      currencyField("insuranceIncreaseYearly", "Insurance Increase per Year (Declared Mods)", { default: 0, max: 10000, step: 25, required: false }),
      currencyField("resaleValueAdded", "Resale Value Added", { default: 0, max: 100000, step: 100, required: false }),
    ],
    calcResult: { label: "Aftermarket Total", format: "currency" },
    calcResults: [
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "aftermarketTotal", label: "Aftermarket Total", format: "currency", highlight: true },
      { key: "oemTotal", label: "OEM Total", format: "currency" },
      { key: "savingsVsOem", label: "Savings vs OEM", format: "currency" },
      { key: "firstYearBudget", label: "First-Year Budget (incl. Insurance)", format: "currency" },
      { key: "netCostAfterResale", label: "Net Cost After Resale Value", format: "currency" },
    ],
    instructions:
      "Aftermarket parts are often 20–50% cheaper than OEM (original manufacturer) parts, though quality varies. For " +
      "modifications, add labor and a contingency for surprises. Mods rarely add their cost to resale value — and some " +
      "reduce it.\n\n" +
      "Tell your insurer about modifications; undeclared mods can lead to a denied claim. Performance mods may also " +
      "affect your warranty and emissions compliance.",
    examples:
      "Example: $2,000 of aftermarket parts with 6 hours of labor and a 10% contingency comes to " +
      "$2,992 — $880 less than OEM.",
    assumptions:
      "Same labor for both. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do aftermarket parts void my warranty?",
        answer: "In the US, a manufacturer can't void your warranty just for using aftermarket parts — only if it proves the part caused the failure.",
      },
    ],
  },
  {
    slug: "custom-wheel-upgrade-cost-calculator",
    title: "Custom Rim and Wheel Upgrade Cost Calculator",
    description: "Estimate the full cost of new custom rims — wheels, tires, TPMS sensors, mounting and alignment — and the extra fuel heavier wheels can use.",
    metaTitle: "Custom Rim & Wheel Upgrade Cost Calculator",
    metaDescription: "Free custom wheel upgrade calculator. Add rims, tires, TPMS sensors, mounting and alignment, plus extra fuel cost.",
    calcInputs: [
      currencyField("wheelPrice", "Price per Wheel", { default: 300, max: 10000, step: 10 }),
      numberField("wheels", "Number of Wheels", { default: 4, min: 1, max: 6, step: 1 }),
      {
        key: "newTires", label: "New Tires Needed?", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Yes", value: 1 },
          { label: "No — Reuse Current Tires", value: 0 },
        ],
      },
      currencyField("tirePrice", "Price per Tire", { default: 200, max: 5000, step: 5 }),
      currencyField("tpmsPerWheel", "TPMS Sensor per Wheel", { default: 50, max: 500, step: 5 }),
      currencyField("mountPerWheel", "Mounting & Balancing per Wheel", { default: 25, max: 200, step: 1 }),
      currencyField("alignment", "Alignment", { default: 100, max: 1000, step: 5, required: false }),
      percentField("mpgLossPercent", "Fuel Economy Loss", { default: 2, max: 20, step: 0.5 }),
      numberField("milesPerYear", "Miles per Year", { default: 12000, min: 0, max: 100000, step: 500 }),
      numberField("mpg", "Current MPG", { default: 28, min: 1, max: 100, step: 1 }),
      currencyField("gasPrice", "Gas Price per Gallon", { default: 3.4, max: 20, step: 0.05 }),
    ],
    calcResult: { label: "Total Upgrade Cost", format: "currency" },
    calcResults: [
      { key: "wheelsCost", label: "Wheels", format: "currency" },
      { key: "tiresCost", label: "Tires", format: "currency" },
      { key: "installationAndSensors", label: "Installation, Sensors & Alignment", format: "currency" },
      { key: "totalUpgradeCost", label: "Total Upgrade Cost", format: "currency", highlight: true },
      { key: "extraFuelPerYear", label: "Extra Fuel per Year", format: "currency" },
    ],
    instructions:
      "Bigger or wider wheels usually need new, lower-profile tires, TPMS sensors and an alignment, which can double the " +
      "cost of the rims alone. Heavier wheels and wider tires can reduce fuel economy and ride comfort.\n\n" +
      "Check the correct bolt pattern, offset and load rating for your vehicle.",
    examples:
      "Example: 4 wheels at $300 each plus new tires and installation cost $2,400, and may add about " +
      "$29.74 a year in fuel.",
    assumptions:
      "Old wheels and tires not resold. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do larger wheels affect my speedometer?",
        answer: "Only if the overall tire diameter changes — matching the original diameter keeps the speedometer accurate.",
      },
    ],
  },
  {
    slug: "off-road-vehicle-upgrade-cost-calculator",
    title: "Off-Road Vehicle Upgrade Cost Calculator",
    description: "Budget an off-road or overlanding build — lift kit, wheels and tires, armor, winch, lighting and overland gear — with labor, a contingency and the extra fuel it'll burn.",
    metaTitle: "Off-Road & Overlanding Build Cost Calculator",
    metaDescription: "Free off-road build calculator. Budget a lift, tires, armor, winch and overland gear with labor and extra fuel cost.",
    calcInputs: [
      currencyField("liftKit", "Lift or Leveling Kit", { default: 1500, max: 50000, step: 50 }),
      currencyField("wheelsTires", "Wheels & All-Terrain Tires", { default: 2500, max: 50000, step: 50 }),
      currencyField("armor", "Bumpers, Skid Plates & Rock Sliders", { default: 1500, max: 50000, step: 50 }),
      currencyField("winch", "Winch & Recovery Gear", { default: 800, max: 20000, step: 50 }),
      currencyField("lighting", "Lighting", { default: 400, max: 10000, step: 25 }),
      currencyField("overlandGear", "Overland Gear (Rooftop Tent, Fridge, Awning, Storage)", { default: 3000, max: 100000, step: 100 }),
      numberField("laborHours", "Labor Hours", { default: 20, min: 0, max: 500, step: 1 }),
      currencyField("laborRate", "Labor Rate per Hour", { default: 120, max: 500, step: 5 }),
      percentField("contingencyPercent", "Contingency", { default: 10, max: 50, step: 1 }),
      numberField("mpgBefore", "MPG Before the Build", { default: 20, min: 1, max: 60, step: 1 }),
      percentField("mpgDropPercent", "MPG Drop After the Build", { default: 10, max: 50, step: 1 }),
      numberField("milesPerYear", "Miles per Year", { default: 12000, min: 0, max: 100000, step: 500 }),
      currencyField("gasPrice", "Gas Price per Gallon", { default: 3.4, max: 20, step: 0.05 }),
    ],
    calcResult: { label: "Total Build Cost", format: "currency" },
    calcResults: [
      { key: "partsTotal", label: "Parts & Gear", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "contingency", label: "Contingency", format: "currency" },
      { key: "totalBuildCost", label: "Total Build Cost", format: "currency", highlight: true },
      { key: "extraFuelPerYear", label: "Extra Fuel per Year", format: "currency" },
    ],
    instructions:
      "Off-road builds add up fast: lifts usually need bigger tires, which may need re-gearing, and heavy armor and gear " +
      "lower fuel economy. Overlanding adds camping and power systems. A contingency covers the parts you find you need " +
      "once work starts.\n\n" +
      "Tell your insurer about modifications, and check that the lift and lighting are legal in your state.",
    examples:
      "Example: $9,700 of parts and gear plus $2,400 of labor and a contingency comes to $13,310, and the heavier rig " +
      "may burn $226.67 more fuel a year.",
    assumptions:
      "Re-gearing and alignment can be added as parts. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does lifting a truck affect insurance?",
        answer: "It can — lifted vehicles may cost more to insure, and undeclared modifications can lead to a denied claim.",
      },
    ],
  },
  {
    slug: "car-camping-conversion-cost-calculator",
    title: "Car Camping Conversion Cost Calculator",
    description: "Budget a car camping or SUV/minivan sleeper conversion — bed platform, mattress, power, fridge and gear — and how quickly it pays off versus hotels.",
    metaTitle: "Car Camping Conversion Cost Calculator — Build vs Hotels",
    metaDescription: "Free car camping conversion calculator. Budget a sleeper build and see how fast it pays off versus hotel nights.",
    calcInputs: [
      currencyField("bedPlatform", "Bed Platform", { default: 300, max: 5000, step: 25 }),
      currencyField("mattress", "Mattress", { default: 150, max: 2000, step: 10 }),
      currencyField("windowCovers", "Window Covers & Ventilation", { default: 100, max: 1000, step: 10 }),
      currencyField("powerStation", "Portable Power Station", { default: 500, max: 5000, step: 25 }),
      currencyField("solarPanel", "Solar Panel", { default: 200, max: 3000, step: 25, required: false }),
      currencyField("fridge", "12V Fridge or Cooler", { default: 300, max: 3000, step: 25 }),
      currencyField("cooking", "Cooking Gear", { default: 150, max: 2000, step: 10 }),
      currencyField("storage", "Storage & Organization", { default: 150, max: 2000, step: 10 }),
      numberField("nightsPerYear", "Nights Camping per Year", { default: 20, min: 0, max: 365, step: 1 }),
      currencyField("hotelPerNight", "Hotel per Night (Alternative)", { default: 130, max: 1000, step: 5 }),
      currencyField("campsitePerNight", "Campsite per Night", { default: 30, max: 500, step: 5 }),
    ],
    calcResult: { label: "Conversion Cost", format: "currency" },
    calcResults: [
      { key: "conversionCost", label: "Conversion Cost", format: "currency", highlight: true },
      { key: "yearlySavingsVsHotels", label: "Yearly Savings vs Hotels", format: "currency" },
      { key: "paybackNights", label: "Nights to Pay Off the Build", format: "number" },
      { key: "firstYearCostPerNight", label: "First-Year Cost per Night", format: "currency" },
    ],
    instructions:
      "A simple car camping setup turns an SUV, minivan or wagon into a place to sleep, without the cost of a camper. A " +
      "flat bed platform with storage underneath, window covers for privacy and airflow, and a power station for lights " +
      "and a fridge cover most needs.\n\n" +
      "Check local rules — overnight parking is restricted in many places; campgrounds and public land are safest.",
    examples:
      "Example: a $1,850 conversion used 20 nights a year saves $2,000 versus hotels, paying off " +
      "after about 18.50 nights.",
    assumptions:
      "Campsite fees compared with hotel prices; extra fuel not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which cars are best for car camping?",
        answer: "Minivans and larger SUVs with fold-flat seats give the most room; many wagons and hatchbacks work for one person.",
      },
    ],
  },
];

// Car & Vehicle Cost Calculators (and its sub-categories) are created on first use, under
// Finance Calculators.
async function ensureCategory() {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  let parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_CATEGORY.slug } });
  if (!parent) {
    const finance = await prisma.toolCategory.findFirst({ where: { slug: { in: FINANCE_SLUGS } } });
    if (!finance) {
      throw new Error(
        `The "finance-calculators" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
          "then re-run this script."
      );
    }
    console.log(`Creating category "${PARENT_CATEGORY.name}" under "${finance.name}".`);
    parent = await prisma.toolCategory.create({
      data: { name: PARENT_CATEGORY.name, slug: PARENT_CATEGORY.slug, parentId: finance.id, templateKey: "category-template-1", viewStyle: "grid" },
    });
  }
  console.log(`Creating sub-category "${CATEGORY.name}" under "${parent.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" },
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
  console.log(
    "New tools are created with status Draft — open them in /admin/tools, review, and set Status to Published " +
      "when you're happy with each one."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
