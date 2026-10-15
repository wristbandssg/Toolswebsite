// One-time (but safe to re-run) batch setup script: creates 9 diamond, ring and coin tools
// from the user's shopping list (Shopping Calculators > Gold, Silver & Jewelry Calculators).
// See src/lib/calc-engine-shopping-gold-diamonds.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-gold-diamonds-calculators.ts
// or
//   npm run db:create-shopping-gold-diamonds-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Gold, Silver & Jewelry Calculators", slug: "gold-silver-jewelry-calculators" };

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

const COLORS: [string, number][] = [["D", 0], ["E", 1], ["F", 2], ["G", 3], ["H", 4], ["I", 5], ["J", 6], ["K", 7]];
const CLARITIES: [string, number][] = [["FL / IF", 0], ["VVS1", 1], ["VVS2", 2], ["VS1", 3], ["VS2", 4], ["SI1", 5], ["SI2", 6], ["I1", 7]];
const CUTS: [string, number][] = [["Excellent / Ideal", 0], ["Very Good", 1], ["Good", 2], ["Fair", 3]];
const SHAPES: [string, number][] = [["Round brilliant", 0], ["Fancy shape (oval, princess, cushion, emerald, pear…)", 1]];
const DIAMOND_NOTE = "Prices are typical 2026 retail estimates for certified stones (GIA/IGI); natural diamond prices fell sharply in 2023–2025 and vary a lot between sellers. Compare real listings with the same grading report.";

const TOOLS: ToolDef[] = [
  {
    slug: "diamond-price-per-carat-calculator",
    title: "Diamond Price Per Carat Calculator",
    description: "Estimate a natural diamond's price per carat and total price from its carat weight, colour, clarity, cut and shape, with a price range and the lab-grown equivalent.",
    metaTitle: "Diamond Price Per Carat Calculator — 4Cs",
    metaDescription: "Free diamond price per carat calculator. Estimate natural diamond prices from carat, colour, clarity, cut and shape, with a lab-grown comparison.",
    calcInputs: [
      numberField("carat", "Carat Weight", { unit: "ct", default: 1.5, max: 10, step: 0.01 }),
      dropdown("color", "Colour", COLORS, 3),
      dropdown("clarity", "Clarity", CLARITIES, 4),
      dropdown("cut", "Cut Grade", CUTS, 0),
      dropdown("shape", "Shape", SHAPES, 0),
    ],
    calcResult: { label: "Estimated Price", format: "currency" },
    calcResults: [
      { key: "estimatedPrice", label: "Estimated Price", format: "currency", highlight: true },
      { key: "pricePerCarat", label: "Price per Carat", format: "currency" },
      { key: "lowEstimate", label: "Low End", format: "currency" },
      { key: "highEstimate", label: "High End", format: "currency" },
      { key: "labGrownEquivalent", label: "Lab-Grown Equivalent", format: "currency" },
    ],
    instructions:
      "Enter the carat weight and choose the colour, clarity, cut and shape from the grading report.\n\n" +
      "Price per carat rises with size, so a 2 ct diamond costs much more than two 1 ct diamonds.",
    examples: "Example: a 1.5 ct G VS2 excellent-cut round is estimated at $11,250.00 — $7,500.00 per carat — with most listings between $9,000.00 and $14,062.50. A similar lab-grown stone is about $1,125.00.",
    assumptions: "Model: price per carat by weight (about $2,500/ct at 0.5 ct, $5,000/ct at 1 ct, $10,500/ct at 2 ct for G VS2 excellent rounds) × colour × clarity × cut × shape factors. Stones just under 'magic' sizes (0.9, 1.9 ct) sell for noticeably less. " + DIAMOND_NOTE,
    faq: [
      { question: "How much is a diamond per carat?", answer: "For natural diamonds it ranges widely — very roughly $2,000–$4,000 per carat at half a carat and $5,000–$12,000+ per carat above one carat, depending on colour, clarity and cut." },
      { question: "Why does price per carat go up with size?", answer: "Large rough diamonds are much rarer than small ones, so each extra carat costs more than the one before." },
    ],
  },
  {
    slug: "1-carat-diamond-price-calculator",
    title: "1 Carat Diamond Price Calculator",
    description: "Estimate what a 1 carat diamond costs by colour, clarity, cut and shape — natural vs lab-grown — and the total with your setting.",
    metaTitle: "1 Carat Diamond Price Calculator — Natural vs Lab",
    metaDescription: "Free 1 carat diamond price calculator. Estimate the price of a 1 ct natural or lab-grown diamond by colour, clarity, cut and shape, with setting.",
    calcInputs: [
      numberField("carat", "Carat Weight", { unit: "ct", default: 1, min: 0.9, max: 1.2, step: 0.01 }),
      dropdown("color", "Colour", COLORS, 3),
      dropdown("clarity", "Clarity", CLARITIES, 4),
      dropdown("cut", "Cut Grade", CUTS, 0),
      dropdown("shape", "Shape", SHAPES, 0),
      currencyField("settingCost", "Setting / Band Cost", { default: 1200, max: 100000, step: 50, required: false }),
    ],
    calcResult: { label: "Natural Diamond Price", format: "currency" },
    calcResults: [
      { key: "naturalPrice", label: "1 Carat Natural Diamond", format: "currency", highlight: true },
      { key: "labGrownPrice", label: "1 Carat Lab-Grown Diamond", format: "currency" },
      { key: "savingsWithLab", label: "Saving With Lab-Grown", format: "currency" },
      { key: "naturalRingTotal", label: "Natural Ring Total", format: "currency" },
      { key: "labRingTotal", label: "Lab-Grown Ring Total", format: "currency" },
    ],
    instructions:
      "Choose the colour, clarity, cut and shape of the 1 carat stone you're considering (you can adjust the weight between 0.90 and 1.20 ct), and add the setting's price.",
    examples: "Example: a 1 ct G VS2 excellent-cut round natural diamond is about $5,000.00; lab-grown is about $800.00. With a $1,200 setting the rings cost $6,200.00 and $2,000.00.",
    assumptions: "A good-value 1 ct choice is often G–H colour and VS2–SI1 clarity with an excellent cut, which looks the same as higher grades to the eye. Lab-grown 1 ct stones have fallen below about $1,000 at many retailers. " + DIAMOND_NOTE,
    faq: [
      { question: "How much does a 1 carat diamond cost?", answer: "Very roughly $3,500–$8,000 for a natural round with good grades, and $700–$1,200 for a lab-grown one." },
      { question: "What is the best colour and clarity for a 1 carat diamond?", answer: "G–H colour and VS2–SI1 clarity give the best value for a stone that looks colourless and clean to the eye, especially with an excellent cut." },
    ],
  },
  {
    slug: "diamond-ring-value-calculator",
    title: "Diamond Ring Value Calculator",
    description: "Estimate what a diamond ring is worth — the resale value you'd likely get and the insurance replacement value — from the diamond's 4Cs, natural or lab, and the setting's metal.",
    metaTitle: "Diamond Ring Value Calculator — Resale & Insurance",
    metaDescription: "Free diamond ring value calculator. Estimate resale and replacement value of a diamond ring from carat, colour, clarity, cut and setting metal.",
    calcInputs: [
      numberField("carat", "Center Diamond", { unit: "ct", default: 1, max: 10, step: 0.01 }),
      dropdown("origin", "Origin", [["Natural", 0], ["Lab-grown", 1]], 0),
      dropdown("color", "Colour", COLORS, 4),
      dropdown("clarity", "Clarity", CLARITIES, 5),
      dropdown("cut", "Cut Grade", CUTS, 1),
      dropdown("shape", "Shape", SHAPES, 0),
      numberField("metalWeight", "Setting Metal Weight", { unit: "g", default: 4, max: 100, step: 0.1, required: false }),
      dropdown("metal", "Setting Metal", [["10K gold", 0], ["14K gold", 1], ["18K gold", 2], ["Platinum", 3]], 1),
      currencyField("settingRetail", "Setting Retail Price (for Replacement)", { default: 1200, max: 100000, step: 50, required: false }),
      currencyField("goldSpot", "Gold Spot Price per Troy Ounce", { default: 4000, max: 100000, step: 1, required: false }),
      currencyField("platinumSpot", "Platinum Spot Price per Troy Ounce", { default: 1600, max: 100000, step: 1, required: false }),
      percentField("resalePercent", "Resale as % of Diamond Retail (0 = Typical)", { default: 0, max: 100, step: 1, required: false }),
    ],
    calcResult: { label: "Resale Value", format: "currency" },
    calcResults: [
      { key: "resaleValue", label: "Likely Resale Value", format: "currency", highlight: true },
      { key: "replacementValue", label: "Insurance Replacement Value", format: "currency" },
      { key: "diamondRetailEstimate", label: "Diamond Retail Estimate", format: "currency" },
      { key: "settingMetalValue", label: "Setting Metal Value", format: "currency" },
      { key: "resaleAsPercentOfReplacement", label: "Resale as % of Replacement", format: "percentage" },
    ],
    instructions:
      "Enter the center diamond's carat and grades from its certificate and whether it's natural or lab-grown. Add the setting's metal weight and type, and what the setting would cost new.\n\n" +
      "Leave resale % at 0 to use typical figures (about 35% for natural, 8% for lab-grown).",
    examples: "Example: a 1 ct H SI1 very-good natural diamond in a 4 g 14K setting would cost about $4,642.50 to replace, but would likely resell for around $1,460.67.",
    assumptions: "Diamonds resell far below retail: natural stones commonly fetch 20–50% of the retail price and lab-grown stones very little. The setting is valued at about 85% of its metal melt value. Branded and antique rings can sell for more. " + DIAMOND_NOTE,
    faq: [
      { question: "How much can I sell my diamond ring for?", answer: "Usually 20–50% of what it would cost new for a natural diamond; lab-grown diamonds resell for much less." },
      { question: "What is replacement value?", answer: "What it would cost to buy a similar ring new at retail — the figure insurers use, which is much higher than resale value." },
    ],
  },
  {
    slug: "lab-diamond-price-calculator",
    title: "Lab Diamond Price Calculator",
    description: "Estimate the price of a lab-grown diamond by carat, colour, clarity, cut and shape, and how much you save compared with a natural diamond of the same grades.",
    metaTitle: "Lab Diamond Price Calculator — Lab vs Natural",
    metaDescription: "Free lab diamond price calculator. Estimate lab-grown diamond prices by carat and grades and compare the saving with a natural diamond.",
    calcInputs: [
      numberField("carat", "Carat Weight", { unit: "ct", default: 2, max: 10, step: 0.01 }),
      dropdown("color", "Colour", COLORS, 2),
      dropdown("clarity", "Clarity", CLARITIES, 3),
      dropdown("cut", "Cut Grade", CUTS, 0),
      dropdown("shape", "Shape", SHAPES, 0),
    ],
    calcResult: { label: "Lab-Grown Price", format: "currency" },
    calcResults: [
      { key: "labGrownPrice", label: "Lab-Grown Diamond Price", format: "currency", highlight: true },
      { key: "pricePerCarat", label: "Price per Carat", format: "currency" },
      { key: "naturalEquivalent", label: "Natural Diamond Equivalent", format: "currency" },
      { key: "savingsPercent", label: "Saving vs Natural", format: "percentage" },
      { key: "resaleEstimate", label: "Likely Resale Value", format: "currency" },
    ],
    instructions:
      "Enter the carat weight and the grades from the IGI or GIA lab-grown report. The calculator compares the price with a natural stone of the same grades.",
    examples: "Example: a 2 ct F VS1 excellent-cut lab-grown round is about $1,548.40 ($774.20 per carat), compared with roughly $26,565.00 for a natural one — a 94.17% saving.",
    assumptions: "Lab-grown prices have fallen fast and are fairly flat per carat (about $600–$900 per carat in 2026), with smaller premiums for top colour and clarity than natural stones. They are chemically identical to natural diamonds but resell for very little. " + DIAMOND_NOTE,
    faq: [
      { question: "How much cheaper are lab-grown diamonds?", answer: "Typically 80–95% cheaper than natural diamonds of the same size and grades." },
      { question: "Do lab-grown diamonds hold their value?", answer: "No — resale value is low and retail prices keep falling, so buy one for how it looks, not as an investment." },
    ],
  },
  {
    slug: "moissanite-price-calculator",
    title: "Moissanite Price Calculator",
    description: "Estimate moissanite prices by diamond-equivalent carat size and brand tier, and compare the cost with lab-grown and natural diamonds of the same size.",
    metaTitle: "Moissanite Price Calculator — vs Lab & Natural",
    metaDescription: "Free moissanite price calculator. Estimate moissanite cost by diamond-equivalent size and brand, and compare with lab and natural diamonds.",
    calcInputs: [
      numberField("carat", "Diamond-Equivalent Size", { unit: "ct DEW", default: 2, max: 10, step: 0.1 }),
      dropdown("tier", "Brand / Quality Tier", [["Value / generic", 0], ["Mid-range jeweler", 1], ["Premium brand", 2]], 1),
      dropdown("shape", "Shape", SHAPES, 0),
      currencyField("settingCost", "Setting Cost", { default: 600, max: 100000, step: 50, required: false }),
    ],
    calcResult: { label: "Moissanite Price", format: "currency" },
    calcResults: [
      { key: "moissanitePrice", label: "Moissanite Price", format: "currency", highlight: true },
      { key: "ringTotal", label: "Ring Total With Setting", format: "currency" },
      { key: "labDiamondPrice", label: "Lab Diamond Same Size", format: "currency" },
      { key: "naturalDiamondPrice", label: "Natural Diamond Same Size", format: "currency" },
      { key: "diameterMm", label: "Round Diameter (mm)", format: "number" },
    ],
    instructions:
      "Enter the size as a diamond-equivalent weight (DEW) — moissanite is lighter than diamond, so sellers size it by how it looks. Choose the brand tier and shape and add the setting.",
    examples: "Example: a 2 ct DEW mid-range moissanite (about 8.15 mm round) costs about $600.00, versus $1,400.00 for a lab diamond and $21,000.00 for a natural diamond of the same size.",
    assumptions: "Moissanite is priced by diamond-equivalent size, roughly $150–$600 per DEW carat by brand; it's very hard (9.25 Mohs) and shows more rainbow sparkle than diamond. Diamond comparisons use G VS2 excellent grades. " + DIAMOND_NOTE,
    faq: [
      { question: "How much does moissanite cost compared with diamond?", answer: "A fraction of the price — often a few hundred dollars for a 1–2 ct look, versus thousands for natural diamond." },
      { question: "What does DEW mean for moissanite?", answer: "Diamond equivalent weight: the carat weight a diamond of the same size would have, since moissanite is about 10% lighter." },
    ],
  },
  {
    slug: "diamond-mm-to-carat-calculator",
    title: "Diamond MM to Carat Calculator",
    description: "Convert a round diamond's diameter in millimetres to its approximate carat weight, or a carat weight to its size in mm — adjusted for depth.",
    metaTitle: "Diamond MM to Carat Calculator — Size Chart",
    metaDescription: "Free diamond mm to carat calculator. Convert round diamond diameter in mm to carat weight, or carat to mm size, with a depth adjustment.",
    calcInputs: [
      dropdown("mode", "Convert", [["Millimetres → carats", 0], ["Carats → millimetres", 1]], 0),
      numberField("diameterMm", "Diameter", { unit: "mm", default: 6.5, max: 30, step: 0.05 }),
      numberField("carat", "Carat Weight", { unit: "ct", default: 1, max: 20, step: 0.01, required: false }),
      percentField("depthPercent", "Depth % (Total Depth ÷ Diameter)", { default: 61, min: 50, max: 75, step: 0.5, required: false }),
    ],
    calcResult: { label: "Carat Weight", format: "number" },
    calcResults: [
      { key: "carat", label: "Carat Weight", format: "number", highlight: true },
      { key: "diameterMm", label: "Diameter (mm)", format: "number" },
      { key: "points", label: "Points (1 ct = 100)", format: "number" },
      { key: "faceUpArea", label: "Face-Up Area (mm²)", format: "number" },
    ],
    instructions:
      "Choose the direction, then enter the round diamond's diameter in millimetres or its carat weight. Adjust the depth percentage if you know it — deeper stones weigh more for the same diameter.",
    examples: "Example: a 6.5 mm round diamond at 61% depth weighs about 1.02 ct (102 points).",
    assumptions: "Carat ≈ 0.0037 × diameter³ for a well-cut round brilliant at about 61% depth, scaled by depth. Reference sizes: 0.5 ct ≈ 5.2 mm, 1 ct ≈ 6.5 mm, 2 ct ≈ 8.1 mm, 3 ct ≈ 9.3 mm. Fancy shapes and coloured gems have different weight-to-size ratios — use the gemstone mm to carat calculator for those.",
    faq: [
      { question: "How many mm is a 1 carat diamond?", answer: "About 6.5 mm across for a well-cut round brilliant." },
      { question: "Why do two 1 carat diamonds look different sizes?", answer: "Cut proportions matter: a deep stone hides weight below the girdle and looks smaller from the top." },
    ],
  },
  {
    slug: "engagement-ring-budget-calculator",
    title: "Engagement Ring Budget Calculator",
    description: "Set an engagement ring budget from your income and savings, split it between the stone and the setting, and see what carat size it buys in natural or lab-grown diamonds.",
    metaTitle: "Engagement Ring Budget Calculator — How Much to Spend",
    metaDescription: "Free engagement ring budget calculator. Set a ring budget from income and savings, split stone vs setting and see the carat it buys.",
    calcInputs: [
      currencyField("annualIncome", "Annual Take-Home Income (0 = Ignore)", { default: 70000, max: 10000000, step: 1000, required: false }),
      numberField("monthsOfIncome", "Months of Income You're Comfortable Spending", { default: 1.5, max: 6, step: 0.5, required: false }),
      currencyField("savingsAvailable", "Savings Set Aside for the Ring", { default: 3000, max: 10000000, step: 100, required: false }),
      currencyField("monthlySaving", "Amount You Can Save per Month", { default: 500, max: 100000, step: 50, required: false }),
      numberField("monthsToSave", "Months Until You Propose", { unit: "months", default: 6, max: 60, required: false }),
      percentField("stoneShare", "Share of Budget for the Center Stone", { default: 70, max: 100, step: 5 }),
    ],
    calcResult: { label: "Ring Budget", format: "currency" },
    calcResults: [
      { key: "ringBudget", label: "Ring Budget", format: "currency", highlight: true },
      { key: "stoneBudget", label: "Center Stone Budget", format: "currency" },
      { key: "settingBudget", label: "Setting Budget", format: "currency" },
      { key: "naturalCaratAffordable", label: "Natural Diamond It Buys (ct, G VS2)", format: "number" },
      { key: "labCaratAffordable", label: "Lab-Grown Diamond It Buys (ct, G VS2)", format: "number" },
    ],
    instructions:
      "Enter your take-home income and how many months of it you're comfortable spending, plus savings and what you can save before you propose — the budget is the lower of the two so you don't go into debt.\n\n" +
      "Choose how much goes to the center stone (often 60–75%).",
    examples: "Example: on $70,000 take-home, 1.5 months is $8,750 — but $3,000 saved plus $500 a month for 6 months caps the budget at $6,000.00. With 70% for the stone ($4,200.00), that buys about a 0.92 ct natural or a 4.76 ct lab-grown G VS2 diamond.",
    assumptions: "There's no rule you have to follow — the old 'two or three months' salary' line came from a diamond ad campaign. The carat estimates use excellent-cut round stones; dropping to H colour or SI1 clarity stretches the budget further.",
    faq: [
      { question: "How much should you spend on an engagement ring?", answer: "Whatever you can pay in cash without hurting your finances. Many couples spend $3,000–$7,000; the 'three months' salary' rule is marketing." },
      { question: "How should I split the budget between the diamond and the setting?", answer: "Commonly 60–75% on the center stone and the rest on the setting and band." },
    ],
  },
  {
    slug: "class-ring-value-calculator",
    title: "Class Ring Value Calculator",
    description: "Find what an old class ring is worth for its metal — 10K, 14K or 18K gold or sterling silver — minus synthetic stones, and what a gold buyer would pay.",
    metaTitle: "Class Ring Value Calculator — Gold Class Rings",
    metaDescription: "Free class ring value calculator. Find the scrap value of 10K, 14K and 18K gold or silver class rings by weight, minus stones.",
    calcInputs: [
      numberField("weight", "Ring Weight", { unit: "g", default: 14, max: 200, step: 0.1 }),
      dropdown("metal", "Metal", [["10K gold", 0], ["14K gold", 1], ["18K gold", 2], ["Sterling silver", 3], ["Alloy (Valadium, Celestrium, Lustrium etc.)", 4]], 0),
      numberField("stoneCarats", "Stone Weight to Deduct", { unit: "ct", default: 5, max: 50, step: 0.5, required: false }),
      currencyField("goldSpot", "Gold Spot Price per Troy Ounce", { default: 4000, max: 100000, step: 1, required: false }),
      currencyField("silverSpot", "Silver Spot Price per Troy Ounce", { default: 48, max: 10000, step: 0.05, required: false }),
      percentField("payoutPercent", "Buyer Payout (% of Melt)", { default: 80, max: 100, step: 1 }),
    ],
    calcResult: { label: "Melt Value", format: "currency" },
    calcResults: [
      { key: "meltValue", label: "Metal Melt Value", format: "currency", highlight: true },
      { key: "buyerOffer", label: "Likely Buyer Offer", format: "currency" },
      { key: "metalWeight", label: "Metal Weight (g)", format: "number" },
      { key: "preciousMetalGrams", label: "Pure Gold or Silver (g)", format: "number" },
    ],
    instructions:
      "Weigh the ring and check the stamp inside the band (10K, 14K, 18K, 'Sterling' or an alloy name). Deduct the stone — class ring stones are usually synthetic, about 3–8 ct. Enter the spot price and buyer payout.",
    examples: "Example: a 14 g 10K class ring with a 5 ct synthetic stone has 13 g of metal containing 5.42 g of gold — $696.66 at $4,000 an ounce, about $557.32 from a buyer.",
    assumptions: "Class rings from the 1950s–1990s are often 10K gold; men's rings typically weigh 10–25 g and women's 5–12 g. Alloys like Valadium, Celestrium and Lustrium contain no gold or silver. The synthetic stone has no resale value. Spot prices change daily.",
    faq: [
      { question: "How much is a gold class ring worth?", answer: "Mostly its gold: a 15 g 10K ring holds about 6 g of pure gold, worth several hundred dollars at today's prices." },
      { question: "Are class ring stones real?", answer: "Usually not — most are synthetic spinel or glass with little or no value." },
    ],
  },
  {
    slug: "coin-value-calculator",
    title: "Coin Value Calculator",
    description: "Find the metal value of everyday and old US coins — copper pennies, nickels, clad and 90% silver coins, silver dollars and gold double eagles — compared with face value.",
    metaTitle: "Coin Value Calculator — Metal Value vs Face Value",
    metaDescription: "Free coin value calculator. Find the copper, nickel, silver or gold value of US coins and how it compares with face value, plus collector premium.",
    calcInputs: [
      dropdown("coin", "Coin", [["Copper penny (1959–1982)", 0], ["Zinc penny (1982+)", 1], ["Nickel (5¢)", 2], ["Clad dime (1965+)", 3], ["Clad quarter (1965+)", 4], ["90% silver dime (pre-1965)", 5], ["90% silver quarter (pre-1965)", 6], ["90% silver half dollar (pre-1965)", 7], ["Morgan / Peace silver dollar", 8], ["$20 gold double eagle", 9]], 0),
      numberField("quantity", "Number of Coins", { default: 500, min: 1, max: 10000000 }),
      currencyField("copperPerLb", "Copper Price per Pound", { default: 4.8, max: 50, step: 0.05, required: false }),
      currencyField("nickelPerLb", "Nickel Price per Pound", { default: 7.2, max: 50, step: 0.05, required: false }),
      currencyField("silverSpot", "Silver Spot per Troy Ounce", { default: 48, max: 10000, step: 0.05, required: false }),
      currencyField("goldSpot", "Gold Spot per Troy Ounce", { default: 4000, max: 100000, step: 1, required: false }),
      percentField("collectorPremium", "Collector Premium Over Melt", { default: 0, max: 1000, step: 5, required: false }),
    ],
    calcResult: { label: "Total Value", format: "currency" },
    calcResults: [
      { key: "totalValue", label: "Total Value", format: "currency", highlight: true },
      { key: "meltValuePerCoin", label: "Metal Value per Coin", format: "currency", decimals: 3 },
      { key: "totalMeltValue", label: "Total Metal Value", format: "currency" },
      { key: "faceValue", label: "Face Value", format: "currency" },
      { key: "meltVsFace", label: "Metal Value ÷ Face Value", format: "number" },
    ],
    instructions:
      "Choose the coin and how many you have, then current metal prices. Add a collector premium for coins worth more than their metal because of rarity or condition.",
    examples: "Example: 500 copper pennies (1959–1982) contain about $0.031 of copper each — $15.63 in metal for $5 of face value, about 3.13 times face.",
    assumptions: "Metal content: copper cents 3.11 g at 95% copper; nickels 5 g of 75% copper/25% nickel; clad coins mostly copper; 90% silver coins by silver weight. It's illegal to melt US pennies and nickels, so their metal value can't easily be realised. Rare dates and errors can be worth far more — check a price guide.",
    faq: [
      { question: "Are old pennies worth more than a cent?", answer: "Copper pennies from before 1982 contain about 2–3 cents of copper at current prices, though melting them is illegal." },
      { question: "How do I know if a coin is valuable?", answer: "Check the date, mint mark and condition against a price guide; silver and gold coins are worth at least their metal value." },
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
