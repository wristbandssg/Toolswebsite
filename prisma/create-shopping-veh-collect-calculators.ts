// One-time (but safe to re-run) batch setup script: creates 12 collectibles value tools
// from the user's shopping list (Shopping Calculators > Vehicle, Resale & Collectibles Calculators).
// See src/lib/calc-engine-shopping-veh-collect.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-veh-collect-calculators.ts
// or
//   npm run db:create-shopping-veh-collect-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Vehicle, Resale & Collectibles Calculators", slug: "vehicle-resale-collectibles-calculators" };

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

const CHANNEL = () => dropdown("channel", "Where You Sell", [["Online marketplace (eBay, etc.)", 1], ["Collector group / forum / show", 0.92], ["Dealer or shop buy offer", 0.55], ["Garage sale / flea market", 0.4]], 1);

const TOOLS: ToolDef[] = [
  {
    slug: "pokemon-card-value-calculator",
    title: "Pokemon Card Value Calculator",
    description: "Estimate what a Pokémon card is worth raw or graded (PSA 7–10) from its recent near-mint sold price — with edition, where you sell, fees and whether grading pays off.",
    metaTitle: "Pokemon Card Value Calculator — What's It Worth?",
    metaDescription: "Free Pokémon card value calculator. Estimate what your Pokémon card is worth by condition / grade and print, after selling fees.",
    calcInputs: [
      currencyField("basePrice", "Recent Sold Price (Raw, Near Mint)", { default: 60, max: 10000000, step: 0.5 }),
      dropdown("grade", "Condition / Grade", [["Raw — damaged", 0.2], ["Raw — played", 0.5], ["Raw — near mint", 1], ["PSA 7", 1.1], ["PSA 8", 1.5], ["PSA 9", 2.5], ["PSA 10 (gem mint)", 8]], 2.5),
      dropdown("factorA", "Print", [["Standard print", 1], ["1st Edition (WOTC era)", 3], ["Shadowless (Base Set)", 1.8]], 1),
      CHANNEL(),
      percentField("feeRate", "Selling Fees", { default: 13.25, max: 50, required: false }),
      currencyField("shippingCost", "Shipping / Delivery Cost You Pay", { default: 5, max: 10000, required: false }),
      currencyField("gradingCost", "Grading Cost (PSA / CGC / Beckett)", { default: 25, max: 10000, required: false }),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Value", format: "currency", highlight: true },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
      { key: "sellingFees", label: "Selling Fees", format: "currency" },
      { key: "netAfterFees", label: "What You Keep After Costs", format: "currency" },
      { key: "multipleOfBase", label: "Value vs Base Price (×)", format: "number" },
    ],
    instructions: "Enter the recent sold price (raw, near mint) — from recent sold (not asking) prices. Then choose the condition / grade, the print and where you'll sell.\n\nAdd your platform's selling fees, grading cost and shipping to see what you'll actually keep.",
    examples: "Example: a card that sells for $60 raw near-mint could be worth about $150.00 graded PSA 9 — about $100.13 after eBay fees, shipping and a $25 grading fee.",
    assumptions: "Grade multipliers are typical for popular cards: PSA 9 often sells for 2–3× raw near-mint and PSA 10 for 5–10× or more (rarer for vintage). Look up the base price in eBay sold listings, PriceCharting or TCGplayer for the exact card, set and language. Where you sell: collector groups about −8%, dealer buy offers about −45%, garage sales about −60% versus online marketplace prices.",
    faq: [
      { question: "How do I find out what my Pokémon card is worth?", answer: "Search sold (not listed) prices for the exact card name, set number and condition on eBay, TCGplayer or PriceCharting." },
      { question: "Is it worth getting Pokémon cards graded?", answer: "Usually only if the card is valuable and could grade PSA 9 or 10 — otherwise grading fees can exceed the gain." },
    ],
  },
  {
    slug: "baseball-card-value-calculator",
    title: "Baseball Card Value Calculator",
    description: "Estimate a baseball card's value raw or graded (PSA 7–10) from its recent near-mint sold price — with where you sell, fees and grading costs.",
    metaTitle: "Baseball Card Value Calculator — What's It Worth?",
    metaDescription: "Free baseball card value calculator. Estimate what your baseball card is worth by condition / grade, after selling fees.",
    calcInputs: [
      currencyField("basePrice", "Recent Sold Price (Raw, Near Mint)", { default: 40, max: 10000000, step: 0.5 }),
      dropdown("grade", "Condition / Grade", [["Raw — poor / creased", 0.15], ["Raw — VG–EX", 0.5], ["Raw — near mint", 1], ["PSA 7", 1.2], ["PSA 8", 1.8], ["PSA 9", 3], ["PSA 10 (gem mint)", 10]], 1.8),
      CHANNEL(),
      percentField("feeRate", "Selling Fees", { default: 13.25, max: 50, required: false }),
      currencyField("shippingCost", "Shipping / Delivery Cost You Pay", { default: 5, max: 10000, required: false }),
      currencyField("gradingCost", "Grading Cost (PSA / SGC / Beckett)", { default: 25, max: 10000, required: false }),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Value", format: "currency", highlight: true },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
      { key: "sellingFees", label: "Selling Fees", format: "currency" },
      { key: "netAfterFees", label: "What You Keep After Costs", format: "currency" },
      { key: "multipleOfBase", label: "Value vs Base Price (×)", format: "number" },
    ],
    instructions: "Enter the recent sold price (raw, near mint) — from recent sold (not asking) prices. Then choose the condition / grade and where you'll sell.\n\nAdd your platform's selling fees, grading cost and shipping to see what you'll actually keep.",
    examples: "Example: a card selling for $40 raw near-mint could bring about $72.00 as a PSA 8 — $32.46 after fees, shipping and grading.",
    assumptions: "Typical grade multipliers for desirable cards; vintage cards (pre-1980) in high grades can carry much larger premiums, while 1987–1994 'junk wax' cards are rarely worth grading. Use sold listings for the exact year, set, card number and parallel. Where you sell: collector groups about −8%, dealer buy offers about −45%, garage sales about −60% versus online marketplace prices.",
    faq: [
      { question: "How do I know if my baseball cards are worth money?", answer: "Look for rookie cards of star players, vintage cards, autographs and low-numbered parallels, then check sold prices." },
      { question: "Are baseball cards from the 1980s and 90s worth anything?", answer: "Most were mass-produced and are worth little, but key rookies in PSA 10 can still be valuable." },
    ],
  },
  {
    slug: "funko-pop-value-calculator",
    title: "Funko Pop Value Calculator",
    description: "Estimate what a Funko Pop is worth from its recent mint-in-box sold price — adjusted for box condition, exclusive stickers and chase variants, with selling fees.",
    metaTitle: "Funko Pop Value Calculator — What's It Worth?",
    metaDescription: "Free funko pop value calculator. Estimate what your Funko Pop is worth by box condition and sticker / variant, after selling fees.",
    calcInputs: [
      currencyField("basePrice", "Recent Sold Price (Mint in Box)", { default: 30, max: 10000000, step: 0.5 }),
      numberField("quantity", "Number of Pops", { default: 1, min: 1, max: 100000 }),
      dropdown("grade", "Box Condition", [["Mint box", 1], ["Near mint (light wear)", 0.9], ["Minor box damage", 0.7], ["Major box damage", 0.4], ["Out of box", 0.3]], 1),
      dropdown("factorA", "Sticker / Variant", [["Common release", 1], ["Store exclusive sticker", 1.2], ["Chase variant", 2.5], ["Convention exclusive (SDCC, NYCC)", 2]], 1),
      CHANNEL(),
      percentField("feeRate", "Selling Fees", { default: 13.25, max: 50, required: false }),
      currencyField("shippingCost", "Shipping / Delivery Cost You Pay", { default: 6, max: 10000, required: false }),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Value", format: "currency", highlight: true },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
      { key: "sellingFees", label: "Selling Fees", format: "currency" },
      { key: "netAfterFees", label: "What You Keep After Costs", format: "currency" },
      { key: "multipleOfBase", label: "Value vs Base Price (×)", format: "number" },
    ],
    instructions: "Enter the recent sold price (mint in box) — from recent sold (not asking) prices, and the number of pops. Then choose the box condition, the sticker / variant and where you'll sell.\n\nAdd your platform's selling fees and shipping to see what you'll actually keep.",
    examples: "Example: a Pop that sells for $30 in a mint box is worth about $30.00 — about $20.02 after fees and shipping.",
    assumptions: "Box condition matters most: collectors pay a premium for mint boxes, and out-of-box Pops are worth far less. Chase and convention exclusives often sell for 2–5× commons. Use eBay sold listings or a price guide for the exact number and variant. Where you sell: collector groups about −8%, dealer buy offers about −45%, garage sales about −60% versus online marketplace prices.",
    faq: [
      { question: "How do I know if my Funko Pop is valuable?", answer: "Check the box number, stickers (chase, exclusives, convention) and sold prices — vaulted and limited editions are most valuable." },
      { question: "Does a damaged box lower a Funko Pop's value?", answer: "Yes — collectors often pay 30–60% less for creased, torn or sun-faded boxes." },
    ],
  },
  {
    slug: "hot-wheels-value-calculator",
    title: "Hot Wheels Value Calculator",
    description: "Estimate what Hot Wheels cars are worth — mainlines, Treasure Hunts, Super Treasure Hunts or vintage Redlines — from sold prices, card condition and fees.",
    metaTitle: "Hot Wheels Value Calculator — What's It Worth?",
    metaDescription: "Free hot wheels value calculator. Estimate what your Hot Wheels car is worth by packaging / condition and rarity, after selling fees.",
    calcInputs: [
      currencyField("basePrice", "Recent Sold Price (Mint on Card)", { default: 15, max: 10000000, step: 0.5 }),
      numberField("quantity", "Number of Cars", { default: 1, min: 1, max: 100000 }),
      dropdown("grade", "Packaging / Condition", [["Mint on card", 1], ["Card wear / soft corners", 0.75], ["Loose, mint", 0.35], ["Loose, played with", 0.15]], 1),
      dropdown("factorA", "Rarity", [["Mainline", 1], ["Treasure Hunt", 2], ["Super Treasure Hunt", 6], ["Redline era (1968–1977)", 4]], 1),
      CHANNEL(),
      percentField("feeRate", "Selling Fees", { default: 13.25, max: 50, required: false }),
      currencyField("shippingCost", "Shipping / Delivery Cost You Pay", { default: 5, max: 10000, required: false }),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Value", format: "currency", highlight: true },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
      { key: "sellingFees", label: "Selling Fees", format: "currency" },
      { key: "netAfterFees", label: "What You Keep After Costs", format: "currency" },
      { key: "multipleOfBase", label: "Value vs Base Price (×)", format: "number" },
    ],
    instructions: "Enter the recent sold price (mint on card) — from recent sold (not asking) prices, and the number of cars. Then choose the packaging / condition, the rarity and where you'll sell.\n\nAdd your platform's selling fees and shipping to see what you'll actually keep.",
    examples: "Example: a mainline car that sells for $15 mint on card nets about $8.01 after fees and shipping — sell cheaper cars in lots so shipping doesn't eat the profit.",
    assumptions: "Most mainline cars sell for $1–$5; Super Treasure Hunts (Spectraflame paint, Real Riders tires) and vintage Redlines are worth far more. Card condition and unpunched blisters matter to collectors. Check the base code and sold listings for the exact casting and color. Where you sell: collector groups about −8%, dealer buy offers about −45%, garage sales about −60% versus online marketplace prices.",
    faq: [
      { question: "How do I tell if a Hot Wheels car is a Super Treasure Hunt?", answer: "Look for Spectraflame paint, rubber Real Riders tires and a small 'TH' logo on the car, plus a gold flame on the card." },
      { question: "Which Hot Wheels are worth the most?", answer: "Vintage Redlines (1968–1977), prototypes, errors and Super Treasure Hunts." },
    ],
  },
  {
    slug: "comic-book-value-calculator",
    title: "Comic Book Value Calculator",
    description: "Estimate a comic book's value raw or CGC-graded from its near-mint sold price — with key issues, variants, where you sell, fees and grading costs.",
    metaTitle: "Comic Book Value Calculator — What's It Worth?",
    metaDescription: "Free comic book value calculator. Estimate what your comic book is worth by condition / grade and issue type, after selling fees.",
    calcInputs: [
      currencyField("basePrice", "Recent Sold Price (Raw, Near Mint 9.4)", { default: 80, max: 10000000, step: 0.5 }),
      dropdown("grade", "Condition / Grade", [["Raw — reading copy (4.0)", 0.25], ["Raw — very fine (8.0)", 0.6], ["Raw — near mint (9.4)", 1], ["CGC 8.0", 0.8], ["CGC 9.0", 1.3], ["CGC 9.4", 1.8], ["CGC 9.8", 4]], 1.8),
      dropdown("factorA", "Issue Type", [["Regular issue", 1], ["Key issue (first appearance)", 2.5], ["Variant cover (1:25 or rarer)", 1.8], ["Newsstand edition (1980s–2000s)", 1.4]], 1),
      CHANNEL(),
      percentField("feeRate", "Selling Fees", { default: 13.25, max: 50, required: false }),
      currencyField("shippingCost", "Shipping / Delivery Cost You Pay", { default: 8, max: 10000, required: false }),
      currencyField("gradingCost", "Grading Cost (CGC / CBCS)", { default: 40, max: 10000, required: false }),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Value", format: "currency", highlight: true },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
      { key: "sellingFees", label: "Selling Fees", format: "currency" },
      { key: "netAfterFees", label: "What You Keep After Costs", format: "currency" },
      { key: "multipleOfBase", label: "Value vs Base Price (×)", format: "number" },
    ],
    instructions: "Enter the recent sold price (raw, near mint 9.4) — from recent sold (not asking) prices. Then choose the condition / grade, the issue type and where you'll sell.\n\nAdd your platform's selling fees, grading cost and shipping to see what you'll actually keep.",
    examples: "Example: a comic selling for $80 raw near-mint could be worth about $144.00 as a CGC 9.4 — $76.92 after fees, shipping and grading.",
    assumptions: "Typical multipliers: slabbed copies sell for more than raw at the same grade, and 9.8s carry large premiums on modern books. Key issues (first appearances) drive most value. Use GoCollect, CovrPrice or eBay sold listings for the exact issue, printing and variant. Where you sell: collector groups about −8%, dealer buy offers about −45%, garage sales about −60% versus online marketplace prices.",
    faq: [
      { question: "How do I find out what my comic books are worth?", answer: "Check the issue number, printing and cover, estimate the grade, then search recent sold prices for that grade." },
      { question: "Is it worth getting a comic graded by CGC?", answer: "For key issues or books likely to grade 9.4+, often yes; for common issues worth under about $100, fees usually eat the gain." },
    ],
  },
  {
    slug: "video-game-value-calculator",
    title: "Video Game Value Calculator",
    description: "Estimate what retro and modern video games are worth — loose, complete in box or sealed — from their complete-in-box sold price, with where you sell and fees.",
    metaTitle: "Video Game Value Calculator — What's It Worth?",
    metaDescription: "Free video game value calculator. Estimate what your video game is worth by condition, after selling fees.",
    calcInputs: [
      currencyField("basePrice", "Recent Sold Price (Complete in Box)", { default: 40, max: 10000000, step: 0.5 }),
      numberField("quantity", "Number of Games", { default: 1, min: 1, max: 100000 }),
      dropdown("grade", "Condition", [["Complete in box (CIB)", 1], ["Loose cartridge / disc only", 0.45], ["Box and manual only", 0.3], ["New, factory sealed", 2.5], ["Graded sealed (WATA / VGA)", 5]], 1),
      CHANNEL(),
      percentField("feeRate", "Selling Fees", { default: 13.25, max: 50, required: false }),
      currencyField("shippingCost", "Shipping / Delivery Cost You Pay", { default: 5, max: 10000, required: false }),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Value", format: "currency", highlight: true },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
      { key: "sellingFees", label: "Selling Fees", format: "currency" },
      { key: "netAfterFees", label: "What You Keep After Costs", format: "currency" },
      { key: "multipleOfBase", label: "Value vs Base Price (×)", format: "number" },
    ],
    instructions: "Enter the recent sold price (complete in box) — from recent sold (not asking) prices, and the number of games. Then choose the condition and where you'll sell.\n\nAdd your platform's selling fees and shipping to see what you'll actually keep.",
    examples: "Example: a game worth $40 complete in box sells for about $40.00 loose — about $29.70 after fees and shipping.",
    assumptions: "Loose games often sell for 30–60% of complete-in-box prices; factory-sealed and graded copies carry big premiums. Game stores typically pay about 30–60% of what they'll resell for. PriceCharting tracks loose, CIB and new prices for most titles. Where you sell: collector groups about −8%, dealer buy offers about −45%, garage sales about −60% versus online marketplace prices.",
    faq: [
      { question: "How do I find the value of my old video games?", answer: "Look up each title on PriceCharting or eBay sold listings by platform and condition (loose, CIB or new)." },
      { question: "Should I sell games to GameStop or online?", answer: "Online usually pays far more; stores are faster and easier but pay less." },
    ],
  },
  {
    slug: "dvd-value-calculator",
    title: "DVD Value Calculator",
    description: "Estimate what your DVDs and Blu-rays are worth — single discs or a whole collection — by format, condition and where you sell, after fees.",
    metaTitle: "DVD Value Calculator — What's It Worth?",
    metaDescription: "Free dvd value calculator. Estimate what your DVD collection is worth by condition and format / type, after selling fees.",
    calcInputs: [
      currencyField("basePrice", "Typical Sold Price per Disc", { default: 3, max: 10000000, step: 0.5 }),
      numberField("quantity", "Number of DVDs / Blu-rays", { default: 50, min: 1, max: 100000 }),
      dropdown("grade", "Condition", [["Like new", 1], ["Good, light scratches", 0.8], ["Heavily scratched / no case", 0.3], ["Factory sealed", 1.4]], 0.8),
      dropdown("factorA", "Format / Type", [["Common DVD", 1], ["Blu-ray", 1.6], ["4K UHD", 2.5], ["Out-of-print / Criterion / cult", 4]], 1),
      CHANNEL(),
      percentField("feeRate", "Selling Fees", { default: 13.25, max: 50, required: false }),
      currencyField("shippingCost", "Shipping / Delivery Cost You Pay", { default: 0, max: 10000, required: false }),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Value", format: "currency", highlight: true },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
      { key: "sellingFees", label: "Selling Fees", format: "currency" },
      { key: "netAfterFees", label: "What You Keep After Costs", format: "currency" },
      { key: "multipleOfBase", label: "Value vs Base Price (×)", format: "number" },
    ],
    instructions: "Enter the typical sold price per disc — from recent sold (not asking) prices, and the number of dvds / blu-rays. Then choose the condition, the format / type and where you'll sell.\n\nAdd your platform's selling fees and shipping to see what you'll actually keep.",
    examples: "Example: 50 common DVDs in good condition are worth about $120.00 in total sold online, or much less as a dealer buy offer.",
    assumptions: "Most common DVDs resell for $1–$5, and buyback apps often pay under $1; Blu-ray and 4K discs and out-of-print or Criterion titles are worth more. Selling a collection as one lot saves effort but lowers the per-disc price. Where you sell: collector groups about −8%, dealer buy offers about −45%, garage sales about −60% versus online marketplace prices.",
    faq: [
      { question: "Are old DVDs worth anything?", answer: "Most common movies are worth $1–$3, but out-of-print, cult and box-set titles can sell for $20–$100+." },
      { question: "Where can I sell DVDs?", answer: "Buyback apps (Decluttr), used media stores, eBay and local marketplaces — selling in bulk is fastest." },
    ],
  },
  {
    slug: "cd-value-calculator",
    title: "CD Value Calculator",
    description: "Estimate what your CDs are worth — single albums or a whole collection — by condition, rarity and where you sell, after fees.",
    metaTitle: "CD Value Calculator — What's It Worth?",
    metaDescription: "Free cd value calculator. Estimate what your CD collection is worth by condition and type, after selling fees.",
    calcInputs: [
      currencyField("basePrice", "Typical Sold Price per CD", { default: 3, max: 10000000, step: 0.5 }),
      numberField("quantity", "Number of CDs", { default: 100, min: 1, max: 100000 }),
      dropdown("grade", "Condition", [["Like new", 1], ["Good, light scratches", 0.8], ["Scratched / cracked case / no booklet", 0.35], ["Factory sealed", 1.5]], 0.8),
      dropdown("factorA", "Type", [["Common pop / rock release", 1], ["Out-of-print / indie", 3], ["Japanese import (with obi)", 4], ["Box set / limited edition", 3]], 1),
      CHANNEL(),
      percentField("feeRate", "Selling Fees", { default: 13.25, max: 50, required: false }),
      currencyField("shippingCost", "Shipping / Delivery Cost You Pay", { default: 0, max: 10000, required: false }),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Value", format: "currency", highlight: true },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
      { key: "sellingFees", label: "Selling Fees", format: "currency" },
      { key: "netAfterFees", label: "What You Keep After Costs", format: "currency" },
      { key: "multipleOfBase", label: "Value vs Base Price (×)", format: "number" },
    ],
    instructions: "Enter the typical sold price per cd — from recent sold (not asking) prices, and the number of cds. Then choose the condition, the type and where you'll sell.\n\nAdd your platform's selling fees and shipping to see what you'll actually keep.",
    examples: "Example: 100 common CDs in good condition are worth about $240.00 sold online — about $208.20 after fees.",
    assumptions: "Common CDs resell for about $1–$4 each; out-of-print, indie pressings, Japanese imports and box sets can bring $10–$100+. Check Discogs for the exact catalog number. Bulk lots sell faster at a lower price per disc. Where you sell: collector groups about −8%, dealer buy offers about −45%, garage sales about −60% versus online marketplace prices.",
    faq: [
      { question: "Are CDs worth anything now?", answer: "Most common CDs are worth a few dollars, but rare pressings and imports can be valuable — check Discogs." },
      { question: "How do I sell a CD collection?", answer: "List valuable titles individually on Discogs or eBay, then sell the rest as a bulk lot or to a used record store." },
    ],
  },
  {
    slug: "autograph-value-calculator",
    title: "Autograph Value Calculator",
    description: "Estimate an autograph's value from sold prices of similar signatures — adjusted for signature quality, authentication and what's signed — after fees.",
    metaTitle: "Autograph Value Calculator — What's It Worth?",
    metaDescription: "Free autograph value calculator. Estimate what your autograph is worth by signature quality and authentication, after selling fees.",
    calcInputs: [
      currencyField("basePrice", "Sold Price of a Similar Authenticated Autograph", { default: 150, max: 10000000, step: 0.5 }),
      dropdown("grade", "Signature Quality", [["Bold, clean, complete", 1.2], ["Good", 1], ["Faded or partial", 0.6], ["Smudged / damaged item", 0.35]], 1),
      dropdown("factorA", "Authentication", [["PSA/DNA, JSA or Beckett certified", 1], ["With photo proof of signing", 0.8], ["Unauthenticated", 0.3]], 1),
      dropdown("factorB", "Item Signed", [["Index card / cut", 0.6], ["Photo 8 × 10", 1], ["Ball, jersey or bat", 1.6], ["Inscribed / personalized", 0.7]], 1),
      CHANNEL(),
      percentField("feeRate", "Selling Fees", { default: 13.25, max: 50, required: false }),
      currencyField("shippingCost", "Shipping / Delivery Cost You Pay", { default: 8, max: 10000, required: false }),
      currencyField("gradingCost", "Authentication Fee", { default: 0, max: 10000, required: false }),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Value", format: "currency", highlight: true },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
      { key: "sellingFees", label: "Selling Fees", format: "currency" },
      { key: "netAfterFees", label: "What You Keep After Costs", format: "currency" },
      { key: "multipleOfBase", label: "Value vs Base Price (×)", format: "number" },
    ],
    instructions: "Enter the sold price of a similar authenticated autograph — from recent sold (not asking) prices. Then choose the signature quality, the authentication, the item signed and where you'll sell.\n\nAdd your platform's selling fees, authentication fee and shipping to see what you'll actually keep.",
    examples: "Example: a certified autograph on an 8 × 10 photo, with similar ones selling for $150, is worth about $150.00 — $122.13 after fees and shipping.",
    assumptions: "Authentication is critical: unauthenticated autographs sell for a fraction of certified ones, and many on the market are fake. Signatures on game-used items and premium items sell higher; personalized inscriptions usually lower value. Base the price on recent sales of the same signer. Where you sell: collector groups about −8%, dealer buy offers about −45%, garage sales about −60% versus online marketplace prices.",
    faq: [
      { question: "How do I know if an autograph is real?", answer: "Get it authenticated by PSA/DNA, JSA or Beckett, which compare it with known exemplars." },
      { question: "Do personalized autographs lose value?", answer: "Usually — collectors prefer plain signatures, so inscriptions to a named person often lower the price." },
    ],
  },
  {
    slug: "antique-furniture-value-calculator",
    title: "Antique Furniture Value Calculator",
    description: "Estimate what antique furniture is worth from comparable sales — adjusted for original finish, refinishing, maker and provenance — and what you'd net after auction or dealer fees.",
    metaTitle: "Antique Furniture Value Calculator — What's It Worth?",
    metaDescription: "Free antique furniture value calculator. Estimate what your antique is worth by condition and maker / provenance, after selling fees.",
    calcInputs: [
      currencyField("basePrice", "Sold Price of a Comparable Piece", { default: 1200, max: 10000000, step: 0.5 }),
      dropdown("grade", "Condition", [["Original finish, excellent", 1.2], ["Good, minor wear", 1], ["Refinished", 0.6], ["Needs restoration", 0.4]], 1),
      dropdown("factorA", "Maker / Provenance", [["Unknown maker", 1], ["Known maker or label", 1.5], ["Documented history (provenance)", 1.8]], 1),
      CHANNEL(),
      percentField("feeRate", "Selling Fees", { default: 20, max: 50, required: false }),
      currencyField("shippingCost", "Shipping / Delivery Cost You Pay", { default: 0, max: 10000, required: false }),
      currencyField("gradingCost", "Appraisal Fee", { default: 0, max: 10000, required: false }),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Value", format: "currency", highlight: true },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
      { key: "sellingFees", label: "Selling Fees", format: "currency" },
      { key: "netAfterFees", label: "What You Keep After Costs", format: "currency" },
      { key: "multipleOfBase", label: "Value vs Base Price (×)", format: "number" },
    ],
    instructions: "Enter the sold price of a comparable piece — from recent sold (not asking) prices. Then choose the condition, the maker / provenance and where you'll sell.\n\nAdd your platform's selling fees, appraisal fee and shipping to see what you'll actually keep.",
    examples: "Example: a piece with comparable sales around $1,200 in good condition is worth about $1,200.00 — about $960.00 after a 20% auction commission.",
    assumptions: "Original finish matters most — refinishing can cut an antique's value by 50% or more. Maker's marks and documented history add value. Auction houses usually charge sellers 15–25% plus photography and shipping; dealers typically pay 30–50% of retail. Get a certified appraisal for valuable pieces. Where you sell: collector groups about −8%, dealer buy offers about −45%, garage sales about −60% versus online marketplace prices.",
    faq: [
      { question: "How do I know if my furniture is antique?", answer: "True antiques are at least 100 years old — look for hand-cut dovetails, saw marks, old hardware and maker's marks." },
      { question: "Does refinishing reduce antique value?", answer: "Usually yes — collectors pay much more for original finish, so clean gently and avoid stripping." },
    ],
  },
  {
    slug: "persian-rug-value-calculator",
    title: "Persian Rug Value Calculator",
    description: "Estimate a Persian or Oriental rug's value from its size, construction, age and condition — and what you'd net selling through a dealer or auction.",
    metaTitle: "Persian Rug Value Calculator — What's It Worth?",
    metaDescription: "Free persian rug value calculator. Estimate what your rug is worth by condition and construction, after selling fees.",
    calcInputs: [
      currencyField("basePrice", "Price per sq ft for This Quality", { default: 40, max: 10000000, step: 0.5 }),
      numberField("quantity", "Rug Size", { unit: "sq ft", default: 54, min: 1, max: 100000 }),
      dropdown("grade", "Condition", [["Excellent", 1.1], ["Good", 1], ["Worn pile / faded", 0.6], ["Damaged (holes, moth, stains)", 0.3]], 1),
      dropdown("factorA", "Construction", [["Machine-made", 0.15], ["Hand-tufted", 0.35], ["Hand-knotted village / tribal", 1], ["Hand-knotted city workshop (Isfahan, Nain, Tabriz, Qum)", 2]], 1),
      dropdown("factorB", "Age", [["New / modern", 1], ["Semi-antique (30–80 years)", 1.2], ["Antique (80+ years)", 1.6]], 1),
      CHANNEL(),
      percentField("feeRate", "Selling Fees", { default: 25, max: 50, required: false }),
      currencyField("shippingCost", "Shipping / Delivery Cost You Pay", { default: 0, max: 10000, required: false }),
      currencyField("gradingCost", "Cleaning / Appraisal", { default: 0, max: 10000, required: false }),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Value", format: "currency", highlight: true },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
      { key: "sellingFees", label: "Selling Fees", format: "currency" },
      { key: "netAfterFees", label: "What You Keep After Costs", format: "currency" },
      { key: "multipleOfBase", label: "Value vs Base Price (×)", format: "number" },
    ],
    instructions: "Enter the price per sq ft for this quality — from recent sold (not asking) prices, and the rug size. Then choose the condition, the construction, the age and where you'll sell.\n\nAdd your platform's selling fees, cleaning / appraisal and shipping to see what you'll actually keep.",
    examples: "Example: a 6 × 9 ft (54 sq ft) hand-knotted village rug at $40 per sq ft in good condition is worth about $2,160.00.",
    assumptions: "Hand-knotted rugs are priced by size, knot density, materials (wool, silk), origin and age. New hand-knotted Persian rugs often retail for $25–$100+ per sq ft; machine-made rugs for a fraction. Dealers and auctions typically take 20–40%. A reputable rug appraiser can check knots per square inch. Where you sell: collector groups about −8%, dealer buy offers about −45%, garage sales about −60% versus online marketplace prices.",
    faq: [
      { question: "How can I tell if a Persian rug is real?", answer: "Look at the back: hand-knotted rugs show individual, slightly irregular knots matching the front, and fringe is part of the warp, not sewn on." },
      { question: "Are old Persian rugs worth anything?", answer: "Good antique and semi-antique hand-knotted rugs in decent condition can be valuable, especially from known weaving cities." },
    ],
  },
  {
    slug: "sneaker-resale-value-calculator",
    title: "Sneaker Resale Value Calculator",
    description: "Estimate the resale value of sneakers from retail price, hype level and condition — and your payout after StockX, GOAT or eBay fees.",
    metaTitle: "Sneaker Resale Value Calculator — What's It Worth?",
    metaDescription: "Free sneaker resale value calculator. Estimate what your pair of sneakers is worth by condition and hype level, after selling fees.",
    calcInputs: [
      currencyField("basePrice", "Retail Price", { default: 180, max: 10000000, step: 0.5 }),
      numberField("quantity", "Pairs", { default: 1, min: 1, max: 100000 }),
      dropdown("grade", "Condition", [["Deadstock (new in box)", 1], ["VNDS (worn once or twice)", 0.85], ["Lightly worn", 0.65], ["Worn", 0.4]], 1),
      dropdown("factorA", "Hype Level", [["General release", 0.9], ["Popular colorway", 1.3], ["Limited / collab", 2.5], ["Grail / ultra-rare", 5]], 1.3),
      CHANNEL(),
      percentField("feeRate", "Selling Fees", { default: 12, max: 50, required: false }),
      currencyField("shippingCost", "Shipping / Delivery Cost You Pay", { default: 0, max: 10000, required: false }),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Value", format: "currency", highlight: true },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
      { key: "sellingFees", label: "Selling Fees", format: "currency" },
      { key: "netAfterFees", label: "What You Keep After Costs", format: "currency" },
      { key: "multipleOfBase", label: "Value vs Base Price (×)", format: "number" },
    ],
    instructions: "Enter the retail price — from recent sold (not asking) prices, and the pairs. Then choose the condition, the hype level and where you'll sell.\n\nAdd your platform's selling fees and shipping to see what you'll actually keep.",
    examples: "Example: a popular $180 colorway, deadstock, is worth about $234.00 — about $205.92 after 12% platform fees.",
    assumptions: "Hype level is a rough multiplier of retail — always check StockX, GOAT and eBay sold prices for the exact size, which can swing value 20–50%. Platforms charge roughly 9–15% in seller and processing fees. Deadstock with the original box and accessories sells best. Where you sell: collector groups about −8%, dealer buy offers about −45%, garage sales about −60% versus online marketplace prices.",
    faq: [
      { question: "How much can I resell sneakers for?", answer: "General releases often resell at or below retail; hyped collabs and limited drops can go for 2–5× retail or more." },
      { question: "Which sneaker resale site has the lowest fees?", answer: "Fees change often, but eBay authenticated sneakers over $150 have had low or no seller fees; compare before listing." },
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
