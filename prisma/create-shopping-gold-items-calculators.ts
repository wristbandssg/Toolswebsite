// One-time (but safe to re-run) batch setup script: creates 12 gold item and conversion tools
// from the user's shopping list (Shopping Calculators > Gold, Silver & Jewelry Calculators).
// See src/lib/calc-engine-shopping-gold-items.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-gold-items-calculators.ts
// or
//   npm run db:create-shopping-gold-items-calculators

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

const SPOT_NOTE = "Precious metal prices move every day — enter today's spot price per troy ounce for an accurate value.";
const KARATS: [string, number][] = [["10K", 0], ["14K", 1], ["18K", 2], ["22K", 3], ["24K", 4], ["9K", 5]];

const TOOLS: ToolDef[] = [
  {
    slug: "scrap-gold-calculator",
    title: "Scrap Gold Calculator",
    description: "Value a mixed lot of scrap gold — 10K, 14K, 18K and 22K pieces weighed separately — at today's spot price, and the payout to expect from a gold buyer.",
    metaTitle: "Scrap Gold Calculator — Mixed Karat Lot Value",
    metaDescription: "Free scrap gold calculator. Enter grams of 10K, 14K, 18K and 22K gold to find the total melt value and a buyer's payout at today's price.",
    calcInputs: [
      numberField("grams10k", "10K Gold", { unit: "g", default: 8, max: 100000, step: 0.1, required: false }),
      numberField("grams14k", "14K Gold", { unit: "g", default: 22, max: 100000, step: 0.1, required: false }),
      numberField("grams18k", "18K Gold", { unit: "g", default: 5, max: 100000, step: 0.1, required: false }),
      numberField("grams22k", "22K Gold", { unit: "g", default: 0, max: 100000, step: 0.1, required: false }),
      currencyField("spotPrice", "Gold Spot Price per Troy Ounce", { default: 4000, max: 100000, step: 1 }),
      percentField("payoutPercent", "Buyer Payout (% of Melt)", { default: 85, max: 100, step: 1 }),
    ],
    calcResult: { label: "Melt Value", format: "currency" },
    calcResults: [
      { key: "meltValue", label: "Total Melt Value", format: "currency", highlight: true },
      { key: "payout", label: "Expected Payout", format: "currency" },
      { key: "pureGoldGrams", label: "Pure Gold (g)", format: "number", decimals: 3 },
      { key: "totalWeight", label: "Total Weight (g)", format: "number" },
      { key: "averagePurity", label: "Average Purity", format: "percentage" },
    ],
    instructions:
      "Sort your scrap by the karat stamp and weigh each group in grams. Enter today's gold spot price and the payout percentage the buyer offers.\n\n" +
      "Weigh without stones where possible — buyers deduct them.",
    examples: "Example: 8 g of 10K, 22 g of 14K and 5 g of 18K hold 19.954 g of pure gold, worth $2,566.09 at $4,000 an ounce. At an 85% payout you'd get about $2,181.18.",
    assumptions: "Purities: 10K 41.67%, 14K 58.5%, 18K 75%, 22K 91.67%. Refiners and online buyers commonly pay 80–95% of melt; jewelry stores and pawn shops 50–80%. Always sort by karat — mixing lowers your payout to the lowest karat. " + SPOT_NOTE,
    faq: [
      { question: "How much is scrap gold worth?", answer: "Its melt value — pure gold content × spot price — minus the buyer's margin, usually 5–20% at a good buyer." },
      { question: "Should I separate gold by karat before selling?", answer: "Yes. Buyers price each karat separately; a mixed bag is often paid at the lowest karat in it." },
    ],
  },
  {
    slug: "gold-filled-scrap-value-calculator",
    title: "Gold Filled Scrap Value Calculator",
    description: "Find the scrap value of gold-filled jewelry and watch cases (1/20 14K, 1/20 12K, 1/10 10K, rolled gold plate) from the weight, gold layer and spot price.",
    metaTitle: "Gold Filled Scrap Value Calculator — 1/20 14K GF",
    metaDescription: "Free gold filled scrap value calculator. Find the gold content and value of 1/20 14K and 12K gold-filled and rolled gold plate items.",
    calcInputs: [
      numberField("weight", "Weight of Gold-Filled Items", { unit: "g", default: 100, max: 1000000, step: 1 }),
      dropdown("gfType", "Stamp", [["1/20 14K GF (5% of weight is 14K)", 0], ["1/20 12K GF (5% of weight is 12K)", 1], ["1/10 10K GF (10% of weight is 10K)", 2], ["1/40 10K RGP — rolled gold plate", 3]], 0),
      currencyField("spotPrice", "Gold Spot Price per Troy Ounce", { default: 4000, max: 100000, step: 1 }),
      percentField("payoutPercent", "Refiner Payout (% of Gold Value)", { default: 65, max: 100, step: 1 }),
    ],
    calcResult: { label: "Gold Value", format: "currency" },
    calcResults: [
      { key: "meltValue", label: "Gold Value", format: "currency", highlight: true },
      { key: "payout", label: "Expected Payout", format: "currency" },
      { key: "pureGoldGrams", label: "Pure Gold (g)", format: "number", decimals: 3 },
      { key: "valuePerGram", label: "Value per Gram of Item", format: "currency" },
    ],
    instructions:
      "Weigh your gold-filled pieces together (remove non-metal parts) and choose the stamp. Enter today's gold spot price and the refiner's payout — lower than for solid gold because separating the gold layer costs more.",
    examples: "Example: 100 g of 1/20 14K gold-filled jewelry contains about 2.925 g of pure gold — $376.16 at $4,000 an ounce. At a 65% payout, expect around $244.51.",
    assumptions: "'1/20' means one-twentieth (5%) of the item's weight is karat gold. Rolled gold plate has a thinner layer (often 1/40). Gold-plated items have far less gold — see the gold plated value calculator. " + SPOT_NOTE,
    faq: [
      { question: "Is gold-filled jewelry worth anything for scrap?", answer: "A little: 1/20 14K gold-filled contains about 2.9% pure gold by weight, so 100 g holds just under 3 g of gold." },
      { question: "What's the difference between gold-filled and gold-plated?", answer: "Gold-filled has a thick bonded layer making up 5% or more of the weight; gold plating is a microscopically thin layer worth very little." },
    ],
  },
  {
    slug: "dental-gold-value-calculator",
    title: "Dental Gold Value Calculator",
    description: "Estimate the scrap value of gold crowns, bridges and fillings from the number of pieces, their weight, the dental alloy type and today's gold price.",
    metaTitle: "Dental Gold Value Calculator — Crowns & Bridges",
    metaDescription: "Free dental gold value calculator. Estimate the gold content and scrap value of dental crowns and bridges by weight, alloy type and spot price.",
    calcInputs: [
      numberField("crowns", "Number of Crowns or Pieces", { default: 4, max: 1000 }),
      numberField("gramsEach", "Average Weight Each", { unit: "g", default: 2.5, max: 50, step: 0.1 }),
      percentField("porcelainPercent", "Porcelain / Tooth Still Attached (Weight %)", { default: 10, max: 80, step: 5, required: false }),
      dropdown("alloy", "Alloy Type", [["Yellow high-noble (about 62% gold)", 0], ["White high-noble (about 45% gold)", 1], ["Noble alloy (about 25% gold)", 2], ["Base metal / silver-coloured (no gold)", 3]], 0),
      currencyField("spotPrice", "Gold Spot Price per Troy Ounce", { default: 4000, max: 100000, step: 1 }),
      percentField("payoutPercent", "Refiner Payout (% of Gold Value)", { default: 75, max: 100, step: 1 }),
    ],
    calcResult: { label: "Gold Value", format: "currency" },
    calcResults: [
      { key: "meltValue", label: "Gold Value", format: "currency", highlight: true },
      { key: "payout", label: "Expected Payout", format: "currency" },
      { key: "metalWeight", label: "Metal Weight (g)", format: "number" },
      { key: "pureGoldGrams", label: "Pure Gold (g)", format: "number", decimals: 3 },
    ],
    instructions:
      "Enter the number of pieces and their average weight (a molar crown is typically 2–4 g), how much of the weight is porcelain or tooth, and the alloy — yellow crowns usually contain the most gold. Add today's spot price and the refiner's payout.",
    examples: "Example: four 2.5 g yellow crowns with 10% porcelain contain about 5.58 g of gold, worth $717.60 at $4,000 an ounce — around $538.20 from a refiner.",
    assumptions: "Dental alloys vary widely; yellow high-noble alloys are often 40–75% gold plus palladium and platinum, which refiners may also pay for. The only way to know exactly is a refiner's assay. " + SPOT_NOTE,
    faq: [
      { question: "How much is a gold crown worth?", answer: "A typical 3 g yellow gold crown contains about 1.5–2 g of gold, worth a few hundred dollars at current prices before refining fees." },
      { question: "Where can I sell dental gold?", answer: "Refiners that accept dental scrap pay most; many assay the metal and also pay for palladium and platinum content." },
    ],
  },
  {
    slug: "pawn-shop-jewelry-gold-calculator",
    title: "Pawn Shop Jewelry & Gold Calculator",
    description: "Estimate what a pawn shop will lend or pay for gold jewelry — the pawn loan, what you'll repay with interest, and how it compares with selling outright.",
    metaTitle: "Pawn Shop Gold Calculator — Pawn Loan vs Sell",
    metaDescription: "Free pawn shop jewelry and gold calculator. Estimate a pawn loan on gold, the repayment with interest and how it compares with selling it.",
    calcInputs: [
      numberField("weight", "Gold Weight", { unit: "g", default: 20, max: 100000, step: 0.1 }),
      dropdown("karat", "Karat", KARATS, 1),
      currencyField("spotPrice", "Gold Spot Price per Troy Ounce", { default: 4000, max: 100000, step: 1 }),
      percentField("loanPercent", "Pawn Loan (% of Melt Value)", { default: 50, max: 100, step: 5 }),
      percentField("monthlyRate", "Monthly Interest & Fees", { default: 15, max: 30, step: 0.5 }),
      numberField("months", "Months Until You Repay", { unit: "months", default: 3, max: 24 }),
      percentField("sellPercent", "Sell Offer (% of Melt Value)", { default: 65, max: 100, step: 5 }),
    ],
    calcResult: { label: "Pawn Loan", format: "currency" },
    calcResults: [
      { key: "pawnLoan", label: "Pawn Loan Amount", format: "currency", highlight: true },
      { key: "repayAmount", label: "Amount to Repay", format: "currency" },
      { key: "interestCost", label: "Interest & Fees", format: "currency" },
      { key: "sellOffer", label: "Offer If You Sell", format: "currency" },
      { key: "meltValue", label: "Melt Value", format: "currency" },
      { key: "aprEquivalent", label: "Equivalent APR", format: "percentage" },
    ],
    instructions:
      "Enter the gold weight and karat and today's spot price. Pawn shops lend a share of the gold's value and charge monthly interest and fees set by state law; enter those, how long you'd keep the loan and the price they'd pay to buy outright.",
    examples: "Example: 20 g of 14K gold has a melt value of $1,504.65. A 50% pawn loan gives you $752.33, and repaying after 3 months at 15% a month costs $1,090.87. Selling instead would get about $978.03.",
    assumptions: "Pawn shops typically lend 25–60% of resale value and pay 50–75% of melt to buy. State laws cap pawn interest and fees, often 5–25% a month. If you don't repay, the shop keeps the item — your credit isn't affected. " + SPOT_NOTE,
    faq: [
      { question: "How much will a pawn shop give for gold?", answer: "Usually 50–75% of the melt value to buy, or a loan of roughly 25–60% of it." },
      { question: "Is it better to pawn or sell gold?", answer: "Pawning lets you get the piece back but costs high monthly interest; selling gets more cash now if you don't need the item back." },
    ],
  },
  {
    slug: "gold-chain-weight-calculator",
    title: "Gold Chain Weight Calculator",
    description: "Estimate how much a gold chain weighs from its length, width in millimetres, style (rope, Cuban, Franco, box, figaro and more), karat and solid or hollow — and its melt value.",
    metaTitle: "Gold Chain Weight Calculator — Grams by Size",
    metaDescription: "Free gold chain weight calculator. Estimate chain weight in grams from length, width, style, karat and solid or hollow, plus melt value.",
    calcInputs: [
      numberField("lengthIn", "Length", { unit: "in", default: 22, max: 60, step: 1 }),
      numberField("widthMm", "Width", { unit: "mm", default: 4, max: 30, step: 0.5 }),
      dropdown("style", "Style", [["Rope", 0], ["Miami Cuban / curb", 1], ["Franco", 2], ["Box", 3], ["Figaro", 4], ["Cable", 5], ["Snake / round", 6], ["Herringbone", 7]], 1),
      dropdown("karat", "Karat", KARATS, 1),
      dropdown("construction", "Construction", [["Solid", 0], ["Hollow", 1]], 0),
      currencyField("spotPrice", "Gold Spot Price per Troy Ounce", { default: 4000, max: 100000, step: 1, required: false }),
    ],
    calcResult: { label: "Estimated Weight", format: "number" },
    calcResults: [
      { key: "estimatedWeight", label: "Estimated Weight (g)", format: "number", highlight: true },
      { key: "weightInDwt", label: "Estimated Weight (dwt)", format: "number" },
      { key: "gramsPerInch", label: "Grams per Inch", format: "number" },
      { key: "estimatedMeltValue", label: "Estimated Melt Value", format: "currency" },
    ],
    instructions:
      "Enter the chain's length and width in millimetres, then choose its style, karat and whether it's solid or hollow. Use the estimate to check a listing's stated weight — then weigh the real chain for an exact value.",
    examples: "Example: a 22 in, 4 mm solid 14K Miami Cuban chain weighs about 25.89 g (16.65 dwt), worth roughly $1,947.87 in gold at $4,000 an ounce.",
    assumptions: "Calibrated to typical solid 14K rope chains (about 0.3 g per inch at 2 mm), scaled by width, a style factor, the karat's density and 45% for hollow. Real chains vary by maker, so treat this as a ±20% estimate. " + SPOT_NOTE,
    faq: [
      { question: "How much does a 4 mm gold chain weigh?", answer: "A 22 in, 4 mm solid 14K rope chain is around 18–22 g; Cuban links of the same width are heavier." },
      { question: "How can I tell if a chain is hollow?", answer: "Hollow chains feel light for their size, dent easily and often have a tiny hole near the clasp. Weighing it against the estimate here is a good check." },
    ],
  },
  {
    slug: "gold-chain-value-calculator",
    title: "Gold Chain Value Calculator",
    description: "Find what a gold chain is worth from its weight and karat — melt value at today's spot price, a typical retail price and what a buyer would pay.",
    metaTitle: "Gold Chain Value Calculator — Melt & Resale",
    metaDescription: "Free gold chain value calculator. Find the melt value, typical retail price and resale offer for a gold chain from its weight and karat.",
    calcInputs: [
      numberField("weight", "Chain Weight", { unit: "g", default: 25, max: 10000, step: 0.1 }),
      dropdown("karat", "Karat", KARATS, 1),
      numberField("lengthIn", "Length", { unit: "in", default: 22, max: 60, required: false }),
      currencyField("spotPrice", "Gold Spot Price per Troy Ounce", { default: 4000, max: 100000, step: 1 }),
      numberField("retailMultiple", "Retail Price ÷ Melt Value", { default: 2, min: 1, max: 5, step: 0.1 }),
      percentField("payoutPercent", "Buyer Payout (% of Melt)", { default: 80, max: 100, step: 1 }),
    ],
    calcResult: { label: "Melt Value", format: "currency" },
    calcResults: [
      { key: "meltValue", label: "Melt Value", format: "currency", highlight: true },
      { key: "retailPrice", label: "Typical Retail Price", format: "currency" },
      { key: "resaleOffer", label: "Likely Resale Offer", format: "currency" },
      { key: "valuePerGram", label: "Value per Gram", format: "currency" },
      { key: "valuePerInch", label: "Gold Value per Inch", format: "currency" },
    ],
    instructions:
      "Weigh the chain and enter its karat and today's gold spot price. Set the retail markup jewelers in your area charge over melt (often 1.5–3×) and the payout a buyer offers.",
    examples: "Example: a 25 g 14K chain has a melt value of $1,880.82. In a store it might retail around $3,761.64, while a gold buyer would pay about $1,504.65.",
    assumptions: "Melt value = grams × purity × spot ÷ 31.1035. Retail prices add labor, design and the jeweler's margin; designer and handmade chains sell for more. Resale is usually close to melt for plain chains. " + SPOT_NOTE,
    faq: [
      { question: "How much is my gold chain worth?", answer: "Its melt value (weight × purity × gold price) is the floor; buyers pay a share of that, while new chains retail for 1.5–3× melt." },
      { question: "Why do gold chains cost much more than their gold?", answer: "Retail prices include manufacturing, design, the retailer's margin and sometimes a brand premium." },
    ],
  },
  {
    slug: "gold-ring-value-calculator",
    title: "Gold Ring Value Calculator",
    description: "Find the gold value of a yellow, white or rose gold ring — from its weight, or estimated from ring size, band width and thickness — minus the weight of any stones.",
    metaTitle: "Gold Ring Value Calculator — White & Yellow Gold",
    metaDescription: "Free gold ring value calculator. Value white, yellow or rose gold rings by weight or by ring size and band dimensions, minus stones.",
    calcInputs: [
      numberField("weight", "Ring Weight (0 = Estimate From Size)", { unit: "g", default: 0, max: 1000, step: 0.1, required: false }),
      dropdown("karat", "Karat", KARATS, 1),
      numberField("ringSize", "US Ring Size", { default: 9, min: 1, max: 16, step: 0.25, required: false }),
      numberField("bandWidthMm", "Band Width", { unit: "mm", default: 6, max: 20, step: 0.5, required: false }),
      numberField("thicknessMm", "Band Thickness", { unit: "mm", default: 1.8, max: 5, step: 0.1, required: false }),
      numberField("stoneCarats", "Total Stone Weight", { unit: "ct", default: 0, max: 50, step: 0.05, required: false }),
      currencyField("spotPrice", "Gold Spot Price per Troy Ounce", { default: 4000, max: 100000, step: 1 }),
      percentField("payoutPercent", "Buyer Payout (% of Melt)", { default: 80, max: 100, step: 1 }),
    ],
    calcResult: { label: "Melt Value", format: "currency" },
    calcResults: [
      { key: "meltValue", label: "Gold Melt Value", format: "currency", highlight: true },
      { key: "buyerOffer", label: "Likely Buyer Offer", format: "currency" },
      { key: "metalWeight", label: "Metal Weight (g)", format: "number" },
      { key: "pureGoldGrams", label: "Pure Gold (g)", format: "number", decimals: 3 },
      { key: "weightEstimated", label: "Weight Estimated? (1 = Yes)", format: "number" },
    ],
    instructions:
      "Weigh the ring if you can. If not, leave the weight at 0 and enter the ring size, band width and thickness to estimate it. Choose the karat (white and rose gold use the same karats as yellow) and enter any stone weight to deduct.",
    examples: "Example: a size 9 men's 14K band, 6 mm wide and 1.8 mm thick, weighs about 9.22 g. Its gold is worth $693.70 at $4,000 an ounce — about $554.96 from a buyer.",
    assumptions: "Estimated weight = π × (inner diameter + thickness) × width × thickness × the karat's density; inner diameter = 11.63 + 0.8128 × US size (mm). Stones are deducted at 0.2 g per carat. White gold is alloyed with palladium or nickel and often rhodium-plated, but its gold content follows the karat. " + SPOT_NOTE,
    faq: [
      { question: "Is white gold worth as much as yellow gold?", answer: "Yes — a 14K white gold ring has the same gold content as a 14K yellow ring of the same weight." },
      { question: "How much does a gold wedding band weigh?", answer: "Typically 3–6 g for women's bands and 6–12 g for men's, depending on width and thickness." },
    ],
  },
  {
    slug: "gold-plated-value-calculator",
    title: "Gold Plated Value Calculator",
    description: "Estimate how much gold is in gold-plated jewelry, electronics or flatware from the surface area and plating thickness — and whether it's worth scrapping after refining fees.",
    metaTitle: "Gold Plated Value Calculator — Is It Worth It?",
    metaDescription: "Free gold plated value calculator. Estimate the gold in plated items from surface area and microns, its value and if scrapping pays.",
    calcInputs: [
      numberField("items", "Number of Items", { default: 50, max: 1000000 }),
      numberField("areaCm2", "Plated Surface Area per Item", { unit: "cm²", default: 10, max: 10000, step: 1 }),
      numberField("microns", "Plating Thickness", { unit: "µm", default: 0.1, max: 10, step: 0.05 }),
      dropdown("platingKarat", "Plating Karat", [["24K", 0], ["18K", 1]], 0),
      currencyField("spotPrice", "Gold Spot Price per Troy Ounce", { default: 4000, max: 100000, step: 1 }),
      currencyField("refiningFee", "Refining / Lot Fee", { default: 75, max: 10000, step: 5, required: false }),
    ],
    calcResult: { label: "Gold Value", format: "currency" },
    calcResults: [
      { key: "goldValue", label: "Gold Value", format: "currency", highlight: true },
      { key: "goldGrams", label: "Gold Content (g)", format: "number", decimals: 4 },
      { key: "valuePerItem", label: "Value per Item", format: "currency", decimals: 4 },
      { key: "netAfterRefining", label: "Net After Refining Fee", format: "currency" },
      { key: "worthScrapping", label: "Worth Scrapping? (1 = Yes)", format: "number" },
    ],
    instructions:
      "Enter the number of items, the plated surface area of each and the plating thickness in microns (flash plating is about 0.1–0.5 µm; heavy plating and vermeil 2.5 µm or more). Add the spot price and any refining fee.",
    examples: "Example: 50 pieces of fashion jewelry with 10 cm² of 0.1 µm 24K plating contain only 0.0964 g of gold — $12.40 in total, or $0.248 each. After a $75 refining fee you would lose money (−$62.60), so it isn't worth scrapping.",
    assumptions: "Gold = area × thickness × 19.3 g/cm³. Plating is extremely thin, so most plated jewelry has a few cents of gold per piece; only large volumes of electronics pins, connectors or heavily plated items are worth refining. " + SPOT_NOTE,
    faq: [
      { question: "Is gold-plated jewelry worth anything?", answer: "Very little for its gold — usually cents per piece. It's worth more as resale jewelry than as scrap." },
      { question: "How thick is gold plating?", answer: "Fashion jewelry is often 0.1–0.5 microns; gold vermeil must be at least 2.5 microns over sterling silver." },
    ],
  },
  {
    slug: "gold-coin-value-calculator",
    title: "Gold Coin Value Calculator",
    description: "Find the gold value of American Eagles, Krugerrands, Maple Leafs, Buffalos, Sovereigns, US $20 Double Eagles and other coins, with dealer buyback and retail prices.",
    metaTitle: "Gold Coin Value Calculator — Melt & Buyback",
    metaDescription: "Free gold coin value calculator. Find melt value, dealer buyback and retail price for Gold Eagles, Krugerrands, Maple Leafs, Sovereigns and more.",
    calcInputs: [
      dropdown("coin", "Coin", [["American Gold Eagle 1 oz", 0], ["American Gold Eagle 1/2 oz", 1], ["American Gold Eagle 1/4 oz", 2], ["American Gold Eagle 1/10 oz", 3], ["Krugerrand 1 oz", 4], ["Canadian Maple Leaf 1 oz", 5], ["American Buffalo 1 oz", 6], ["Britannia 1 oz", 7], ["British Sovereign", 8], ["US $20 Double Eagle (pre-1933)", 9], ["US $10 Eagle (pre-1933)", 10], ["US $5 Half Eagle (pre-1933)", 11], ["Mexican 50 Pesos", 12]], 0),
      numberField("quantity", "Quantity", { default: 2, min: 1, max: 100000 }),
      currencyField("spotPrice", "Gold Spot Price per Troy Ounce", { default: 4000, max: 100000, step: 1 }),
      percentField("buybackPercent", "Dealer Buyback (% of Melt)", { default: 98, max: 110, step: 0.5 }),
      percentField("premiumPercent", "Dealer Selling Premium Over Spot", { default: 5, max: 50, step: 0.5 }),
    ],
    calcResult: { label: "Melt Value", format: "currency" },
    calcResults: [
      { key: "meltValue", label: "Gold Melt Value", format: "currency", highlight: true },
      { key: "dealerBuyback", label: "Dealer Buyback", format: "currency" },
      { key: "retailWithPremium", label: "Cost to Buy (With Premium)", format: "currency" },
      { key: "goldOunces", label: "Actual Gold Weight (oz)", format: "number", decimals: 4 },
      { key: "valuePerCoin", label: "Melt Value per Coin", format: "currency" },
    ],
    instructions:
      "Choose the coin and quantity and enter today's gold spot price. Add the buyback percentage a dealer pays and the premium they charge to sell, to see both sides of the trade.",
    examples: "Example: two 1 oz American Gold Eagles contain 2 oz of gold, worth $8,000.00 at $4,000 an ounce. A dealer might buy them for about $7,840.00 and sell them for $8,400.00.",
    assumptions: "Values use each coin's actual gold weight (e.g. Sovereign 0.2354 oz, $20 Double Eagle 0.9675 oz, 50 Pesos 1.2057 oz), not its gross weight. Rare dates and high grades of pre-1933 US coins can be worth far more than melt — have them graded before selling. " + SPOT_NOTE,
    faq: [
      { question: "How much is a 1 oz gold coin worth?", answer: "About the spot price of gold for an ounce of metal; dealers usually buy slightly below spot and sell 3–8% above." },
      { question: "Are old US gold coins worth more than their gold?", answer: "Common-date coins trade near melt plus a small premium; rare dates and well-preserved coins can be worth much more." },
    ],
  },
  {
    slug: "gold-bar-value-calculator",
    title: "Gold Bar Value Calculator",
    description: "Find the value of gold bars from 1 gram to 1 kilogram at today's spot price, what you'd pay with a dealer premium, the buyback price and the round-trip cost.",
    metaTitle: "Gold Bar Value Calculator — 1 g to 1 kg Bars",
    metaDescription: "Free gold bar value calculator. Value 1 g, 10 g, 1 oz, 100 g, 10 oz and 1 kg gold bars, with dealer premium, buyback and round-trip cost.",
    calcInputs: [
      dropdown("barSize", "Bar Size", [["1 gram", 0], ["5 grams", 1], ["10 grams", 2], ["1 troy ounce", 3], ["50 grams", 4], ["100 grams", 5], ["10 troy ounces", 6], ["1 kilogram", 7]], 3),
      numberField("quantity", "Quantity", { default: 3, min: 1, max: 100000 }),
      currencyField("spotPrice", "Gold Spot Price per Troy Ounce", { default: 4000, max: 100000, step: 1 }),
      percentField("premiumPercent", "Dealer Premium Over Spot", { default: 3, max: 50, step: 0.25 }),
      percentField("buybackPercent", "Dealer Buyback (% of Spot Value)", { default: 99, max: 110, step: 0.25 }),
    ],
    calcResult: { label: "Melt Value", format: "currency" },
    calcResults: [
      { key: "meltValue", label: "Gold Value at Spot", format: "currency", highlight: true },
      { key: "costToBuy", label: "Cost to Buy", format: "currency" },
      { key: "buybackValue", label: "Dealer Buyback", format: "currency" },
      { key: "roundTripCost", label: "Round-Trip Cost (Buy − Sell)", format: "currency" },
      { key: "priceRiseToBreakEven", label: "Price Rise Needed to Break Even", format: "percentage" },
    ],
    instructions:
      "Choose the bar size and quantity, enter today's spot price, then the premium the dealer charges and the buyback rate they pay. Small bars carry much higher premiums than large ones.",
    examples: "Example: three 1 oz bars are worth $11,998.80 at $4,000 an ounce. With a 3% premium they cost $12,358.76, and the dealer would buy them back for $11,878.81 — gold needs to rise 4.04% before you break even.",
    assumptions: "Bars are valued at 99.99% purity. Typical premiums: 1 g bars 10–20%, 1 oz bars 2–5%, 1 kg bars about 1%. Sales tax, shipping and storage aren't included. " + SPOT_NOTE,
    faq: [
      { question: "Which gold bar size is the best value?", answer: "Larger bars carry smaller premiums per ounce, but small bars are easier to sell in parts. 1 oz and 100 g bars are a common middle ground." },
      { question: "How much do dealers pay for gold bars?", answer: "Usually close to spot — often 97–100% for recognised brands in good condition." },
    ],
  },
  {
    slug: "gold-to-silver-ratio-calculator",
    title: "Gold to Silver Ratio Calculator",
    description: "Calculate the gold-to-silver ratio from today's prices, how many ounces of silver your gold could buy, and how the ratio compares with its long-run average.",
    metaTitle: "Gold to Silver Ratio Calculator — Today's Ratio",
    metaDescription: "Free gold to silver ratio calculator. Find the gold/silver ratio, silver ounces per gold ounce and how today's ratio compares with history.",
    calcInputs: [
      currencyField("goldPrice", "Gold Price per Troy Ounce", { default: 4000, max: 100000, step: 1 }),
      currencyField("silverPrice", "Silver Price per Troy Ounce", { default: 48, max: 10000, step: 0.05 }),
      numberField("goldOunces", "Gold You Own", { unit: "oz", default: 2, max: 100000, step: 0.1, required: false }),
      numberField("historicalAverage", "Long-Run Average Ratio to Compare", { default: 70, min: 1, max: 200, step: 1 }),
    ],
    calcResult: { label: "Gold-to-Silver Ratio", format: "number" },
    calcResults: [
      { key: "goldSilverRatio", label: "Gold-to-Silver Ratio", format: "number", highlight: true },
      { key: "silverOuncesForYourGold", label: "Silver Ounces Your Gold Could Buy", format: "number" },
      { key: "versusAverage", label: "Versus Long-Run Average", format: "percentage" },
      { key: "silverPriceAtAverageRatio", label: "Silver Price If the Ratio Returned to Average", format: "currency" },
    ],
    instructions:
      "Enter today's gold and silver prices per troy ounce, the gold you own and the average ratio you want to compare with (about 60–70 over the last 50 years).",
    examples: "Example: gold at $4,000 and silver at $48 gives a ratio of 83.33 — one ounce of gold buys about 83 ounces of silver. That's 19.05% above a 70 average; at 70, silver would be $57.14.",
    assumptions: "Ratio = gold price ÷ silver price. Some investors swap toward silver when the ratio is high and toward gold when it's low, but the ratio can stay far from its average for years. Not investment advice.",
    faq: [
      { question: "What is the gold-to-silver ratio?", answer: "How many ounces of silver it takes to buy one ounce of gold — the gold price divided by the silver price." },
      { question: "What is a high gold-to-silver ratio?", answer: "Above about 80 is historically high, suggesting silver is cheap relative to gold; below 50 is historically low." },
    ],
  },
  {
    slug: "gold-weight-calculator",
    title: "Gold Weight (Gram) Calculator",
    description: "Convert gold weight between grams, troy ounces, pennyweight, tola, ounces and grains, and find what that weight of gold is worth at any karat.",
    metaTitle: "Gold Weight Calculator — Grams, Troy Oz, Tola",
    metaDescription: "Free gold weight calculator. Convert gold between grams, troy ounces, pennyweight, tola and grains, and value it at any karat and spot price.",
    calcInputs: [
      numberField("weight", "Weight", { default: 2, max: 1000000, step: 0.001 }),
      dropdown("fromUnit", "Unit", [["Grams", 0], ["Troy ounces", 1], ["Pennyweight (dwt)", 2], ["Tola", 3], ["Ounces (avoirdupois)", 4], ["Grains", 5]], 3),
      dropdown("karat", "Karat", KARATS, 3),
      currencyField("spotPrice", "Gold Spot Price per Troy Ounce", { default: 4000, max: 100000, step: 1, required: false }),
    ],
    calcResult: { label: "Grams", format: "number" },
    calcResults: [
      { key: "grams", label: "Grams", format: "number", decimals: 3, highlight: true },
      { key: "troyOunces", label: "Troy Ounces", format: "number", decimals: 4 },
      { key: "pennyweight", label: "Pennyweight (dwt)", format: "number" },
      { key: "tola", label: "Tola", format: "number", decimals: 3 },
      { key: "avoirdupoisOunces", label: "Ounces (Avoirdupois)", format: "number", decimals: 3 },
      { key: "value", label: "Gold Value at This Karat", format: "currency" },
    ],
    instructions:
      "Enter the weight and its unit, then the karat and spot price to see the value. Precious metals are priced in troy ounces, which are about 10% heavier than kitchen (avoirdupois) ounces.",
    examples: "Example: 2 tola of 22K gold is 23.328 g, or 0.75 troy oz, worth $2,750.10 at $4,000 an ounce.",
    assumptions: "1 troy ounce = 31.1035 g; 1 pennyweight = 1.5552 g; 1 tola = 11.6638 g; 1 avoirdupois ounce = 28.3495 g; 1 grain = 0.0648 g. " + SPOT_NOTE,
    faq: [
      { question: "How many grams are in a troy ounce?", answer: "31.1035 grams — about 10% more than a regular (avoirdupois) ounce of 28.35 g." },
      { question: "How many grams is a tola of gold?", answer: "A tola is 11.6638 grams, a unit still used for gold in India, Pakistan and the Gulf." },
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
