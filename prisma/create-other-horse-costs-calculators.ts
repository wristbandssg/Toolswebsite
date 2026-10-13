// One-time (but safe to re-run) batch setup script: creates the 8 tools of
// the other-sports sub-batch "Horse Ownership & Facilities". See
// src/lib/calc-engine-other-football.ts for the full list
// of 17 sub-batches (all under Sports Calculators > Other Sports
// Calculators), and src/lib/calc-engine-other-horse-costs.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-other-horse-costs-calculators.ts
// or
//   npm run db:create-other-horse-costs-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Other Sports Calculators", slug: "other-sports-calculators" };

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

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "percentage", unit: "%", required: true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 1000000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

const DISCLAIMER =
  "Estimates for planning, training and fun. Sizing, ratings and physics models are approximations — check official rules, manufacturer charts and qualified coaches, and treat health figures as general guidance, not medical advice.";

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

const num = (key: string, label: string, highlight = false, decimals?: number) => ({ key, label, format: "number", ...(decimals !== undefined ? { decimals } : {}), ...(highlight ? { highlight: true } : {}) });

const pct = (key: string, label: string, highlight = false) => ({ key, label, format: "percentage", ...(highlight ? { highlight: true } : {}) });
const cur = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", ...(highlight ? { highlight: true } : {}) });

const TOOLS: ToolDef[] = [
  {
    slug: "horse-arena-sand-calculator",
    title: "Horse Arena Sand Calculator",
    description: "Calculate how many tons and cubic yards of sand (and base) you need for a riding arena — plus truckloads and cost.",
    metaTitle: "Horse Arena Sand Calculator — Tons & Cost",
    metaDescription: "Free arena sand calculator. Get tons and cubic yards of footing and base for a horse arena, truckloads and material cost.",
    calcInputs: [numberField("length", "Arena Length (ft)", { default: 120, max: 1000 }), numberField("width", "Arena Width (ft)", { default: 60, max: 1000 }), numberField("sandDepth", "Sand Depth (in)", { default: 3, max: 12, step: 0.5 }), numberField("baseDepth", "Base Depth (in, 0 if existing)", { default: 0, max: 12, step: 0.5, required: false }), currencyField("sandPrice", "Sand Price per Ton", { default: 35 }), currencyField("basePrice", "Base Price per Ton", { default: 30, required: false }), numberField("truckTons", "Tons per Truckload", { default: 20, min: 1, max: 40 })],
    calcResult: { label: "Sand Tons", format: "number" },
    calcResults: [num("sandTons", "Sand (tons)", true), num("sandCubicYards", "Sand (cubic yards)"), num("baseTons", "Base (tons)"), num("truckloads", "Truckloads"), cur("materialCost", "Material Cost")],
    instructions: "Enter the arena size, the footing depth you want and, if you're building a new base, its depth. Add your local prices.",
    examples: "Example: a 120 × 60 ft arena with 3\" of sand needs about 66.7 cubic yards — 90 tons, 5 truckloads, about $3,150 at $35 a ton.",
    assumptions: "Volume (yd³) = length × width × depth (in) ÷ 12 ÷ 27; sand ≈ 1.35 tons per cubic yard, crushed base ≈ 1.4. Most disciplines use 2–4\" of footing (dressage / jumping 3–4\", reining deeper on a firm base). Sand settles — order 5–10% extra. " + DISCLAIMER,
    faq: [
      { question: "How deep should arena sand be?", answer: "Usually 2–4 inches; too deep strains tendons." },
      { question: "What sand is best for an arena?", answer: "Washed, angular, medium-coarse sand that doesn't break down into dust." },
    ],
  },
  {
    slug: "horse-shipping-cost-calculator",
    title: "Horse Shipping Cost Calculator",
    description: "Estimate the cost of shipping a horse by professional hauler — per-mile rate, minimum charge, layovers and health papers.",
    metaTitle: "Horse Shipping Cost Calculator — Transport Cost",
    metaDescription: "Free horse shipping cost calculator. Estimate horse transport cost by distance, rate per mile, layovers and paperwork.",
    calcInputs: [numberField("miles", "Distance (miles)", { default: 500, max: 5000 }), currencyField("ratePerMile", "Rate per Mile per Horse", { default: 1.75, step: 0.05 }), numberField("horses", "Horses", { default: 1, min: 1, max: 20 }), currencyField("minimumCharge", "Minimum Charge", { default: 300 }), numberField("layoverNights", "Layover Nights", { default: 0, max: 10, required: false }), currencyField("layoverFee", "Layover Fee per Night", { default: 75 }), currencyField("paperwork", "Health Certificate & Coggins per Horse", { default: 150 })],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [cur("totalCost", "Total Cost", true), cur("costPerHorse", "Cost per Horse"), cur("haulingCost", "Hauling Charge"), num("drivingDays", "Approx. Driving Days")],
    instructions: "Enter the distance, the hauler's rate and minimum, any layover nights and the vet paperwork cost.",
    examples: "Example: one horse 500 miles at $1.75 a mile = $875, plus $150 for the health certificate and Coggins → $1,025.",
    assumptions: "Typical US rates are about $1–$3 per loaded mile per horse; shared loads are cheaper, private box stalls dearer. Interstate travel needs a negative Coggins test and a certificate of veterinary inspection. About 500 miles per driving day. " + DISCLAIMER,
    faq: [
      { question: "How much does it cost to ship a horse cross-country?", answer: "Often $2,500–$5,000 for 2,500+ miles on a shared commercial trailer." },
      { question: "How long can a horse travel in a day?", answer: "Most haulers stop every 3–4 hours and do 10–12 hours a day, with overnight layovers on long trips." },
    ],
  },
  {
    slug: "saddle-size-calculator",
    title: "Saddle Size Calculator",
    description: "Find your English and Western saddle seat size from your thigh length.",
    metaTitle: "Saddle Size Calculator — English & Western Seat Size",
    metaDescription: "Free saddle size calculator. Get your English and Western saddle seat size from thigh length and build.",
    calcInputs: [numberField("thighLength", "Thigh Length (seated: back of buttock to back of knee)", { default: 19, min: 8, max: 70, step: 0.25 }), dropdown("unit", "Unit", [["inches", 1], ["cm", 2]], 1), dropdown("build", "Build", [["Slim", 1], ["Average", 2], ["Fuller seat / hips", 3]], 2)],
    calcResult: { label: "English Seat", format: "number" },
    calcResults: [num("englishSeat", "English Seat Size (in)", true), num("westernSeat", "Western Seat Size (in)"), num("thighInches", "Thigh Length (in)")],
    instructions: "Sit on a chair with knees at 90° and feet flat, and measure from the back of your buttock to the back of your knee.",
    examples: "Example: a 19\" thigh → a 17\" English saddle or a 15\" Western saddle.",
    assumptions: "Thigh length → English seat: ≤ 16.5\" = 15\", ≤ 18.5\" = 16\", ≤ 20\" = 17\", ≤ 21.5\" = 17.5\", ≤ 23.5\" = 18\", longer = 18.5\"+; a fuller build adds about ½\". Western seats run about 2\" smaller. Saddle tree width must also fit the horse. " + DISCLAIMER,
    faq: [
      { question: "Why are Western seat sizes smaller?", answer: "They're measured differently (from the base of the horn to the cantle), so a 15\" Western is similar to a 17\" English." },
      { question: "What if I'm between sizes?", answer: "Try both; jumping saddles often feel smaller because of the forward position." },
    ],
  },
  {
    slug: "what-size-horse-should-i-ride-calculator",
    title: "What Size Horse Should I Ride Calculator",
    description: "Find the minimum horse weight for your weight (20% rule), the ideal weight and a suitable height range for your height.",
    metaTitle: "What Size Horse Should I Ride? — Rider Weight Calculator",
    metaDescription: "Free what size horse should I ride calculator. Use the 20% rider weight rule and your height to find a suitable horse.",
    calcInputs: [dropdown("unit", "Units", [["lb & inches", 1], ["kg & cm", 2]], 1), numberField("riderWeight", "Your Weight", { default: 170, min: 20, max: 500 }), numberField("tackWeight", "Saddle & Tack Weight", { default: 30, max: 100 }), numberField("riderHeight", "Your Height", { default: 66, min: 30, max: 230 }), numberField("horseWeight", "A Horse's Weight (optional)", { default: 1100, max: 3000, required: false })],
    calcResult: { label: "Minimum Horse Weight", format: "number" },
    calcResults: [num("minHorseWeightLb", "Minimum Horse Weight (lb, 20% rule)", true), num("idealHorseWeightLb", "Ideal Horse Weight (lb, 15%)"), num("horseHeightFromHands", "Suggested Height — From (hands)"), num("horseHeightToHands", "Suggested Height — To (hands)"), pct("loadPctOfYourHorse", "Your Load on That Horse")],
    instructions: "Enter your weight, your saddle and tack, your height and — to check a particular horse — its weight.",
    examples: "Example: a 170 lb rider with 30 lb of tack (200 lb total) suits a horse of at least 1,000 lb (ideally 1,333 lb). At 5'6\" a 15.0–16.0 hh horse fits well; on an 1,100 lb horse the load is 18.2%.",
    assumptions: "Widely used guideline: rider + tack ≤ 20% of the horse's weight (15% ideal), from studies of horse fatigue (e.g. Powell et al., 2008). Fitness, conformation (short back, strong loins), rider balance and work type matter too. Height ranges are typical, not strict. " + DISCLAIMER,
    faq: [
      { question: "Is the 20% rule official?", answer: "It's a guideline; some groups use 15–20%. Heavy, short-backed breeds can carry more." },
      { question: "Do tall riders need tall horses?", answer: "Mostly for leg position and balance — a wide-barrelled 15 hh horse can suit a tall rider." },
    ],
  },
  {
    slug: "cost-of-owning-a-horse-calculator",
    title: "Cost of Owning a Horse Calculator",
    description: "Add up the monthly and yearly cost of owning a horse — board, feed, farrier, vet, dental, insurance, tack and lessons.",
    metaTitle: "Cost of Owning a Horse Calculator — Monthly & Yearly",
    metaDescription: "Free cost of owning a horse calculator. Estimate monthly and annual horse costs: board, farrier, vet, insurance and more.",
    calcInputs: [currencyField("board", "Board per Month (or feed & bedding at home)", { default: 600 }), currencyField("feedSupplements", "Extra Feed & Supplements per Month", { default: 50 }), currencyField("farrierPerVisit", "Farrier per Visit", { default: 60 }), numberField("farrierWeeks", "Weeks between Farrier Visits", { default: 7, min: 4, max: 16 }), currencyField("vetPerYear", "Routine Vet per Year (vaccines, checks)", { default: 600 }), currencyField("dentalPerYear", "Dental per Year", { default: 150 }), currencyField("dewormingPerYear", "Deworming / Fecal Tests per Year", { default: 80 }), currencyField("horseValue", "Horse Value (for insurance)", { default: 8000 }), percentField("insurancePct", "Mortality Insurance Rate", { default: 3.5, max: 10, step: 0.1 }), currencyField("tackSupplies", "Tack & Supplies per Month", { default: 40 }), currencyField("lessonsShows", "Lessons / Shows per Month", { default: 100 }), numberField("years", "Years", { default: 1, max: 40 })],
    calcResult: { label: "Monthly Cost", format: "currency" },
    calcResults: [cur("monthlyCost", "Monthly Cost", true), cur("annualCost", "Annual Cost"), cur("totalOverYears", "Total over the Years Entered"), cur("farrierPerYear", "Farrier per Year")],
    instructions: "Fill in what you pay (or expect to pay). Set board to your feed and bedding costs if the horse lives at home.",
    examples: "Example: $600 board, $50 supplements, a $60 trim every 7 weeks, $600 vet, $150 dental, $80 deworming, 3.5% insurance on $8,000, $40 supplies and $100 lessons → about $920 a month, $11,036 a year.",
    assumptions: "Farrier visits per year = 52 ÷ weeks between visits. Insurance = value × rate ÷ 12 per month. Emergency vet bills (colic surgery can cost $5,000–$15,000+), trailers, truck costs and property upkeep are not included — keep an emergency fund. " + DISCLAIMER,
    faq: [
      { question: "How much does a horse cost per year?", answer: "Commonly $5,000–$15,000+ depending on board, location and discipline." },
      { question: "Is keeping a horse at home cheaper?", answer: "Often per month, but land, fencing, shelter, equipment and your time add up." },
    ],
  },
  {
    slug: "horse-value-calculator",
    title: "Horse Value Calculator",
    description: "Estimate what a horse is worth from comparable sales, adjusted for age, training, soundness and registration.",
    metaTitle: "Horse Value Calculator — How Much Is My Horse Worth?",
    metaDescription: "Free horse value calculator. Estimate a horse's market value from comparable sales, age, training and soundness.",
    calcInputs: [currencyField("comparablePrice", "Typical Price of Similar Horses (breed, discipline, size)", { default: 10000 }), numberField("age", "Age (years)", { default: 9, max: 40 }), dropdown("training", "Training", [["Green / unstarted", 1], ["Started under saddle", 2], ["Finished / solid", 3], ["Show-proven / winning record", 4]], 3), dropdown("soundness", "Soundness", [["Sound", 1], ["Minor issues / maintenance", 2], ["Pasture sound only", 3]], 1), dropdown("registered", "Registered with Papers?", [["Yes", 1], ["No", 2]], 1)],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [cur("estimatedValue", "Estimated Value", true), cur("lowEstimate", "Low Estimate (−20%)"), cur("highEstimate", "High Estimate (+20%)")],
    instructions: "Start with what similar horses are selling for (same breed, discipline, size and level), then describe the horse.",
    examples: "Example: comparable horses sell for $10,000; a sound, registered, finished 9-year-old is worth about $10,000 (range $8,000–$12,000).",
    assumptions: "Value = comparable price × age factor (under 4: 0.7; 4–12: 1.0; 13–16: 0.75; 17–20: 0.5; 21+: 0.25) × training (0.6 / 0.8 / 1.0 / 1.5) × soundness (1.0 / 0.7 / 0.2) × papers (1.0 / 0.8). A rough guide — temperament, show record, bloodlines and the local market change prices a lot. " + DISCLAIMER,
    faq: [
      { question: "What age is a horse worth the most?", answer: "Usually between about 6 and 12 — trained and experienced but with many riding years left." },
      { question: "Does a vet check affect value?", answer: "Yes — a pre-purchase exam finding can drop the price sharply." },
    ],
  },
  {
    slug: "horse-fence-calculator",
    title: "Horse Fence Calculator",
    description: "Calculate fencing for a horse paddock — perimeter, posts, boards or wire/tape length, gates and acres enclosed.",
    metaTitle: "Horse Fence Calculator — Posts, Boards & Wire",
    metaDescription: "Free horse fence calculator. Work out posts, boards, wire or electric tape and acreage for a paddock or pasture.",
    calcInputs: [dropdown("shape", "Paddock", [["Rectangle (length × width)", 1], ["Enter total perimeter", 2]], 1), numberField("length", "Length (ft)", { default: 300, max: 10000 }), numberField("width", "Width (ft)", { default: 150, max: 10000 }), numberField("perimeter", "Perimeter (ft)", { default: 1000, max: 100000 }), numberField("gates", "Gates", { default: 1, max: 20 }), numberField("gateWidth", "Gate Width (ft)", { default: 12, min: 4, max: 20 }), numberField("postSpacing", "Post Spacing (ft)", { default: 10, min: 4, max: 20 }), numberField("rails", "Rails / Strands", { default: 3, min: 1, max: 6 }), numberField("boardLength", "Board Length (ft)", { default: 16, min: 8, max: 20 })],
    calcResult: { label: "Posts", format: "number" },
    calcResults: [num("posts", "Posts", true), num("fenceLengthFt", "Fence Length excl. Gates (ft)"), num("boards", "Boards (if board fence)"), num("wireOrTapeFt", "Wire / Tape (ft, if wire or electric)"), num("acresEnclosed", "Acres Enclosed")],
    instructions: "Enter the paddock dimensions (or perimeter), gates, post spacing and how many rails or strands.",
    examples: "Example: a 300 × 150 ft paddock with one 12 ft gate has 888 ft of fence: 91 posts at 10 ft spacing, 167 sixteen-foot boards for 3 rails (or 2,664 ft of tape), enclosing 1.03 acres.",
    assumptions: "Perimeter minus gate openings; posts = fence ÷ spacing + 2 per gate (corners may need bracing). Boards = length × rails ÷ board length. Horse fences are usually 4.5–5 ft high; avoid barbed wire. Add 5–10% for waste. " + DISCLAIMER,
    faq: [
      { question: "How much land does a horse need?", answer: "A common guide is 1.5–2 acres of good pasture per horse." },
      { question: "What's the safest horse fence?", answer: "Well-built board, vinyl rail or wide electric tape — highly visible with no sharp edges." },
    ],
  },
  {
    slug: "horse-trailer-weight-calculator",
    title: "Horse Trailer Weight Calculator",
    description: "Calculate a loaded horse trailer's weight and tongue weight and check it against your truck's towing capacity.",
    metaTitle: "Horse Trailer Weight Calculator — Towing Check",
    metaDescription: "Free horse trailer weight calculator. Get loaded trailer weight, tongue or pin weight and the % of your tow rating used.",
    calcInputs: [numberField("trailerEmpty", "Empty Trailer Weight (lb)", { default: 3500, max: 30000 }), numberField("horses", "Horses", { default: 2, max: 10 }), numberField("horseWeight", "Average Horse Weight (lb)", { default: 1100, max: 3000 }), numberField("cargo", "Tack, Hay & Water (lb)", { default: 400, max: 5000 }), dropdown("hitch", "Hitch", [["Bumper pull", 1], ["Gooseneck", 2]], 1), numberField("towCapacity", "Truck Towing Capacity (lb)", { default: 10000, max: 40000 })],
    calcResult: { label: "Loaded Weight", format: "number" },
    calcResults: [num("loadedWeightLb", "Loaded Trailer Weight (lb)", true), num("tongueWeightLb", "Tongue / Pin Weight (lb)"), pct("pctOfTowCapacity", "Share of Tow Capacity"), num("withinEightyPctRule", "Within the 80% Rule (1 = yes)"), num("spareCapacityLb", "Spare Capacity (lb)")],
    instructions: "Enter the trailer's empty weight (on its VIN plate), the horses, gear and your truck's towing capacity.",
    examples: "Example: a 3,500 lb two-horse bumper pull with two 1,100 lb horses and 400 lb of gear weighs 6,100 lb — about 732 lb on the tongue and 61% of a 10,000 lb rating.",
    assumptions: "Tongue weight ≈ 12% of loaded weight for bumper pulls (10–15% range), ≈ 20% pin weight for goosenecks (15–25%). Many haulers keep loaded weight under 80% of the tow rating for live animals. Also check the trailer GVWR and the truck's payload and GCWR. " + DISCLAIMER,
    faq: [
      { question: "What truck do I need for a two-horse trailer?", answer: "Usually a half-ton pickup with 7,500+ lb towing for a light bumper pull; heavier steel or living-quarters trailers need ¾-ton or bigger." },
      { question: "Why does tongue weight matter?", answer: "Too little makes the trailer sway; too much overloads the truck's rear axle." },
    ],
  },
];
async function ensureCategory(cat: { name: string; slug: string }) {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: cat.slug } });
  if (existing) return existing;
  const parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_SLUG } });
  if (!parent) throw new Error(`The "${PARENT_SLUG}" category doesn't exist yet — create it in /admin first.`);
  console.log(`Creating sub-category "${cat.name}" under "${parent.name}".`);
  return prisma.toolCategory.create({
    data: { name: cat.name, slug: cat.slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategory(CATEGORY);

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
