// One-time (but safe to re-run) batch setup script: creates 11 silver, platinum and weight tools
// from the user's shopping list (Shopping Calculators > Gold, Silver & Jewelry Calculators).
// See src/lib/calc-engine-shopping-gold-silver.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-gold-silver-calculators.ts
// or
//   npm run db:create-shopping-gold-silver-calculators

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

const TOOLS: ToolDef[] = [
  {
    slug: "troy-ounce-calculator",
    title: "Troy Ounce Calculator",
    description: "Convert troy ounces to grams, kilograms, regular ounces, grains and pennyweight (and back), and value the weight of gold, silver or platinum at its spot price.",
    metaTitle: "Troy Ounce Calculator — Troy Oz to Grams & Value",
    metaDescription: "Free troy ounce calculator. Convert troy ounces to grams, kilograms, ounces and grains and back, and value precious metal at the spot price.",
    calcInputs: [
      numberField("amount", "Amount", { default: 10, max: 10000000, step: 0.001 }),
      dropdown("unit", "Unit", [["Troy ounces", 0], ["Grams", 1], ["Kilograms", 2], ["Ounces (avoirdupois)", 3], ["Grains", 4], ["Pennyweight", 5]], 0),
      currencyField("pricePerOzt", "Metal Price per Troy Ounce (Optional)", { default: 48, max: 100000, step: 0.01, required: false }),
    ],
    calcResult: { label: "Troy Ounces", format: "number" },
    calcResults: [
      { key: "troyOunces", label: "Troy Ounces", format: "number", decimals: 4, highlight: true },
      { key: "grams", label: "Grams", format: "number" },
      { key: "kilograms", label: "Kilograms", format: "number", decimals: 4 },
      { key: "avoirdupoisOunces", label: "Regular (Avoirdupois) Ounces", format: "number", decimals: 4 },
      { key: "grains", label: "Grains", format: "number" },
      { key: "metalValue", label: "Value at the Price Entered", format: "currency" },
    ],
    instructions:
      "Enter an amount and choose its unit. Optionally enter the metal's price per troy ounce — gold, silver, platinum or palladium — to value it.",
    examples: "Example: 10 troy ounces is 311.03 g, or 10.9714 regular ounces. At $48 an ounce for silver, it's worth $480.00.",
    assumptions: "1 troy ounce = 31.1035 g = 480 grains = 20 pennyweight. A regular (avoirdupois) ounce is 28.3495 g, so a troy ounce is about 9.7% heavier. A troy pound (12 troy oz) is lighter than a regular pound.",
    faq: [
      { question: "What is a troy ounce?", answer: "The unit used to weigh precious metals: 31.1035 grams, about 10% heavier than a regular ounce." },
      { question: "How many troy ounces are in a kilogram?", answer: "32.15 troy ounces." },
    ],
  },
  {
    slug: "pennyweight-calculator",
    title: "Pennyweight Calculator",
    description: "Convert pennyweight (dwt) to grams and troy ounces and see the jeweler's price per pennyweight for 10K, 14K and 18K gold and sterling silver at today's spot prices.",
    metaTitle: "Pennyweight Calculator — DWT to Grams & Price",
    metaDescription: "Free pennyweight calculator. Convert dwt to grams and troy ounces and find the price per pennyweight of 10K, 14K and 18K gold and sterling.",
    calcInputs: [
      numberField("weight", "Weight", { default: 12, max: 1000000, step: 0.01 }),
      dropdown("unit", "Unit", [["Pennyweight (dwt)", 0], ["Grams", 1], ["Troy ounces", 2]], 0),
      currencyField("goldSpot", "Gold Spot Price per Troy Ounce", { default: 4000, max: 100000, step: 1 }),
      currencyField("silverSpot", "Silver Spot Price per Troy Ounce", { default: 48, max: 10000, step: 0.05, required: false }),
    ],
    calcResult: { label: "Pennyweight", format: "number" },
    calcResults: [
      { key: "pennyweight", label: "Pennyweight (dwt)", format: "number", highlight: true },
      { key: "grams", label: "Grams", format: "number" },
      { key: "price10kPerDwt", label: "10K Gold per dwt", format: "currency" },
      { key: "price14kPerDwt", label: "14K Gold per dwt", format: "currency" },
      { key: "price18kPerDwt", label: "18K Gold per dwt", format: "currency" },
      { key: "sterlingPerDwt", label: "Sterling Silver per dwt", format: "currency" },
      { key: "valueAt14k", label: "Your Weight in 14K Gold", format: "currency" },
    ],
    instructions:
      "Enter a weight in pennyweight, grams or troy ounces and today's gold and silver spot prices. Gold buyers often quote prices per dwt — compare their offer with these melt prices.",
    examples: "Example: 12 dwt is 18.66 g. With gold at $4,000, 14K gold is worth $117.00 per dwt, so 12 dwt of 14K has a melt value of $1,404.00.",
    assumptions: "1 pennyweight = 1.5552 g = 1/20 troy ounce. Price per dwt = spot ÷ 20 × purity (10K 41.67%, 14K 58.5%, 18K 75%, sterling 92.5%). " + SPOT_NOTE,
    faq: [
      { question: "How many grams is a pennyweight?", answer: "1.5552 grams; there are 20 pennyweight in a troy ounce." },
      { question: "Why do gold buyers use pennyweight?", answer: "It's the traditional jeweler's unit in the US. Converting to grams makes it easier to compare offers." },
    ],
  },
  {
    slug: "jewelry-weight-calculator",
    title: "Jewelry Weight Calculator",
    description: "Estimate the finished metal weight of a cast jewelry piece from its wax or resin model weight, for silver, gold or platinum, plus the metal to melt and its cost.",
    metaTitle: "Jewelry Weight Calculator — Wax to Metal Weight",
    metaDescription: "Free jewelry weight calculator. Convert a wax or resin model's weight to cast metal weight in silver, gold or platinum, with metal cost.",
    calcInputs: [
      numberField("modelWeight", "Wax or Resin Model Weight", { unit: "g", default: 0.6, max: 1000, step: 0.01 }),
      dropdown("modelType", "Model Material", [["Carving / injection wax", 0], ["3D-printed castable resin", 1]], 0),
      dropdown("metal", "Casting Metal", [["Sterling silver", 0], ["10K gold", 1], ["14K gold", 2], ["18K gold", 3], ["Platinum 950", 4], ["22K gold", 5]], 2),
      percentField("sprueAllowance", "Sprue & Button Allowance", { default: 30, max: 200, step: 5 }),
      currencyField("metalPricePerGram", "Metal Price per Gram", { default: 76, max: 1000, step: 0.5, required: false }),
    ],
    calcResult: { label: "Cast Weight", format: "number" },
    calcResults: [
      { key: "castWeight", label: "Finished Cast Weight (g)", format: "number", highlight: true },
      { key: "metalToMelt", label: "Metal to Melt (g)", format: "number" },
      { key: "weightRatio", label: "Metal ÷ Model Weight Ratio", format: "number" },
      { key: "metalCost", label: "Metal Cost (Including Sprue)", format: "currency" },
      { key: "castWeightDwt", label: "Cast Weight (dwt)", format: "number" },
    ],
    instructions:
      "Weigh your wax or resin model and choose the metal. Add a sprue and button allowance — extra metal for the casting tree, usually recovered and reused — and the metal price per gram to see what the casting costs.",
    examples: "Example: a 0.6 g wax ring model cast in 14K gold weighs about 7.86 g (a ratio of 13.1). With a 30% sprue allowance, melt 10.22 g, costing about $776.57.",
    assumptions: "Metal weight = model weight × (metal specific gravity ÷ model specific gravity). Wax is about 1.0 and castable resin about 1.2. Ratios: sterling ×10.4, 14K ×13.1, 18K ×15.6, platinum ×20.7 from wax. Finishing removes 5–10% of the weight.",
    faq: [
      { question: "How do you convert wax weight to metal weight?", answer: "Multiply the wax weight by the metal's specific gravity — about 10.4 for sterling, 13 for 14K gold, 15.6 for 18K and 21 for platinum." },
      { question: "How much extra metal do I need for casting?", answer: "Add 25–50% for the sprue and button; that extra is usually remelted later." },
    ],
  },
  {
    slug: "junk-silver-calculator",
    title: "Junk Silver Calculator",
    description: "Find the melt value of junk silver — pre-1965 US 90% silver dimes, quarters and halves by face value, 40% Kennedy halves and 35% war nickels — and what a dealer pays.",
    metaTitle: "Junk Silver Calculator — 90% Silver Coin Value",
    metaDescription: "Free junk silver calculator. Value pre-1965 90% silver coins by face value, plus 40% halves and war nickels, at today's silver price.",
    calcInputs: [
      currencyField("face90", "Face Value of 90% Silver Coins (Pre-1965)", { default: 20, max: 1000000, step: 0.05 }),
      currencyField("face40Halves", "Face Value of 40% Kennedy Halves (1965–1970)", { default: 5, max: 1000000, step: 0.5, required: false }),
      numberField("warNickels", "35% War Nickels (1942–1945)", { default: 10, max: 1000000, required: false }),
      currencyField("spotPrice", "Silver Spot Price per Troy Ounce", { default: 48, max: 10000, step: 0.05 }),
      percentField("dealerPercent", "Dealer Offer (% of Melt)", { default: 92, max: 110, step: 1 }),
    ],
    calcResult: { label: "Melt Value", format: "currency" },
    calcResults: [
      { key: "meltValue", label: "Melt Value", format: "currency", highlight: true },
      { key: "dealerOffer", label: "Likely Dealer Offer", format: "currency" },
      { key: "silverOunces", label: "Silver Content (oz)", format: "number", decimals: 4 },
      { key: "timesFaceValue", label: "Times Face Value", format: "number" },
      { key: "valuePerDollarFace90", label: "Value per $1 Face of 90% Silver", format: "currency" },
    ],
    instructions:
      "Add up the face value of your pre-1965 dimes, quarters and half dollars (for example 40 quarters = $10 face). Add the face value of 1965–1970 Kennedy halves and the number of 1942–1945 war nickels, then today's silver price.",
    examples: "Example: $20 face of 90% silver, $5 of 40% halves and 10 war nickels contain 16.3416 oz of silver — $784.40 at $48 an ounce, about 30.76 times face value.",
    assumptions: "Each $1 face of circulated 90% dimes, quarters or halves holds about 0.715 troy oz of silver (allowing for wear); 40% halves 0.2958 oz per $1 face; each war nickel 0.05626 oz. Dealers usually pay close to melt for junk silver. Rare dates are worth more — check before selling. " + SPOT_NOTE,
    faq: [
      { question: "What is junk silver?", answer: "Circulated US dimes, quarters and half dollars from 1964 and earlier, which are 90% silver and worth more for their metal than their face value." },
      { question: "How much silver is in $1 face value of 90% coins?", answer: "About 0.715 troy ounces for circulated coins (0.7234 oz when new)." },
    ],
  },
  {
    slug: "silver-coin-value-calculator",
    title: "Silver Coin Value Calculator",
    description: "Find the silver value of Silver Eagles, Maple Leafs, Britannias, Morgan and Peace dollars, Walking Liberty and Kennedy halves, quarters, dimes and war nickels.",
    metaTitle: "Silver Coin Value Calculator — Melt & Buyback",
    metaDescription: "Free silver coin value calculator. Find the melt value, dealer buyback and retail price of bullion and US silver coins at today's silver price.",
    calcInputs: [
      dropdown("coin", "Coin", [["American Silver Eagle 1 oz", 0], ["Canadian Silver Maple Leaf 1 oz", 1], ["Britannia 1 oz", 2], ["Austrian Philharmonic 1 oz", 3], ["Morgan dollar (1878–1921)", 4], ["Peace dollar (1921–1935)", 5], ["Walking Liberty half (1916–1947)", 6], ["Franklin / 1964 Kennedy half", 7], ["Kennedy half 40% (1965–1970)", 8], ["Washington quarter (pre-1965)", 9], ["Mercury / Roosevelt dime (pre-1965)", 10], ["War nickel (1942–1945)", 11]], 0),
      numberField("quantity", "Quantity", { default: 20, min: 1, max: 1000000 }),
      currencyField("spotPrice", "Silver Spot Price per Troy Ounce", { default: 48, max: 10000, step: 0.05 }),
      percentField("buybackPercent", "Dealer Buyback (% of Melt)", { default: 100, max: 150, step: 1 }),
      percentField("premiumPercent", "Dealer Selling Premium Over Spot", { default: 12, max: 100, step: 1 }),
    ],
    calcResult: { label: "Melt Value", format: "currency" },
    calcResults: [
      { key: "meltValue", label: "Silver Melt Value", format: "currency", highlight: true },
      { key: "dealerBuyback", label: "Dealer Buyback", format: "currency" },
      { key: "retailWithPremium", label: "Cost to Buy (With Premium)", format: "currency" },
      { key: "silverOunces", label: "Silver Content (oz)", format: "number", decimals: 4 },
      { key: "valuePerCoin", label: "Melt Value per Coin", format: "currency" },
    ],
    instructions:
      "Choose the coin and quantity, then today's silver spot price. Add the dealer's buyback percentage and selling premium to see both sides.",
    examples: "Example: 20 American Silver Eagles contain 20 oz of silver, worth $960.00 at $48 an ounce. A dealer might sell them for $1,075.20.",
    assumptions: "Uses each coin's actual silver content (Morgan and Peace dollars 0.7734 oz; 90% halves 0.3617 oz; quarters 0.1808 oz; dimes 0.0723 oz). Silver Eagles carry higher premiums than generic rounds. Key dates and high grades can be worth much more than melt. " + SPOT_NOTE,
    faq: [
      { question: "How much is a silver coin worth?", answer: "At least its melt value — silver content × spot price — plus a premium for bullion coins, and more for rare dates or grades." },
      { question: "How much silver is in a Morgan dollar?", answer: "0.7734 troy ounces (90% silver, 26.73 g)." },
    ],
  },
  {
    slug: "sterling-silver-value-calculator",
    title: "Sterling Silver Value Calculator",
    description: "Find the melt value of sterling silver (92.5%) jewelry, trays, tea sets and other items by weight, allowing for weighted or filled pieces like candlesticks.",
    metaTitle: "Sterling Silver Value Calculator — 925 Melt Value",
    metaDescription: "Free sterling silver value calculator. Find the melt value of 925 sterling jewelry and items by weight, minus filling in weighted pieces.",
    calcInputs: [
      numberField("weight", "Weight", { default: 500, max: 1000000, step: 0.1 }),
      dropdown("unit", "Unit", [["Grams", 0], ["Troy ounces", 1], ["Regular ounces", 2]], 0),
      percentField("weightedFill", "Weighted / Filled Portion (Candlesticks, Handles)", { default: 0, max: 90, step: 5, required: false }),
      currencyField("spotPrice", "Silver Spot Price per Troy Ounce", { default: 48, max: 10000, step: 0.05 }),
      percentField("payoutPercent", "Buyer Payout (% of Melt)", { default: 75, max: 100, step: 1 }),
    ],
    calcResult: { label: "Melt Value", format: "currency" },
    calcResults: [
      { key: "meltValue", label: "Sterling Melt Value", format: "currency", highlight: true },
      { key: "buyerOffer", label: "Likely Buyer Offer", format: "currency" },
      { key: "pureSilverOunces", label: "Pure Silver (oz)", format: "number", decimals: 4 },
      { key: "sterlingGrams", label: "Sterling Weight Counted (g)", format: "number" },
      { key: "valuePerGram", label: "Value per Gram of Sterling", format: "currency" },
    ],
    instructions:
      "Weigh items stamped 'Sterling' or '925' and enter the weight. For weighted pieces (candlesticks, some bowls and handles filled with cement or pitch), enter how much of the weight is filling — often 70–90%. Add today's silver price and the buyer's payout.",
    examples: "Example: 500 g of sterling silver contains 14.8697 oz of pure silver, worth $713.75 at $48 an ounce — about $535.31 from a buyer.",
    assumptions: "Sterling is 92.5% silver. Silver-plated items (EPNS, 'silver on copper', Sheffield plate) contain almost no silver. Antique and designer pieces can be worth more as collectibles than as melt. " + SPOT_NOTE,
    faq: [
      { question: "How much is sterling silver worth per gram?", answer: "About 92.5% of the silver spot price per gram — at $48 an ounce, roughly $1.43 per gram." },
      { question: "How can I tell sterling from silver plate?", answer: "Sterling is stamped 'Sterling', '925' or with hallmarks; silver plate is often marked EP, EPNS, 'silver plate' or with a maker's plate mark." },
    ],
  },
  {
    slug: "silver-dollar-value-calculator",
    title: "Silver Dollar Value Calculator",
    description: "Estimate what Morgan, Peace, Eisenhower silver and American Silver Eagle dollars are worth — melt value plus a typical premium for the coins' condition.",
    metaTitle: "Silver Dollar Value Calculator — Morgan & Peace",
    metaDescription: "Free silver dollar value calculator. Estimate the value of Morgan, Peace and Eisenhower silver dollars from silver price and condition.",
    calcInputs: [
      numberField("coins", "Number of Silver Dollars", { default: 10, max: 100000 }),
      dropdown("dollarType", "Type", [["Morgan dollar (90%)", 0], ["Peace dollar (90%)", 1], ["Eisenhower 40% silver", 2], ["American Silver Eagle", 3]], 0),
      dropdown("condition", "Condition", [["Circulated / worn (+10%)", 0], ["About uncirculated (+30%)", 1], ["Uncirculated (+60%)", 2], ["Choice / high-grade uncirculated (+150%)", 3]], 0),
      currencyField("spotPrice", "Silver Spot Price per Troy Ounce", { default: 48, max: 10000, step: 0.05 }),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Value", format: "currency", highlight: true },
      { key: "meltValue", label: "Melt Value", format: "currency" },
      { key: "silverOunces", label: "Silver Content (oz)", format: "number", decimals: 4 },
      { key: "meltPerCoin", label: "Melt Value per Coin", format: "currency" },
      { key: "conditionPremium", label: "Condition Premium Over Melt", format: "percentage" },
    ],
    instructions:
      "Enter how many silver dollars you have, their type and a typical condition, plus today's silver price. Check dates and mint marks — key dates (like 1893-S or 1895 Morgans) are worth far more.",
    examples: "Example: 10 circulated Morgan dollars contain 7.734 oz of silver, a melt value of $371.23. With a typical 10% premium for common circulated dates, they're worth about $408.36.",
    assumptions: "Morgan and Peace dollars hold 0.7734 oz of silver; 40% Eisenhower dollars 0.3161 oz. Premiums are rough averages for common dates — rare dates, mint marks and certified high grades can be worth hundreds or thousands. " + SPOT_NOTE,
    faq: [
      { question: "How much is a Morgan silver dollar worth?", answer: "Common circulated dates sell for a little over their silver value — 0.7734 oz × the silver price — while rare dates and high grades are worth much more." },
      { question: "Are 1971–1978 Eisenhower dollars silver?", answer: "Only the 40% silver collector versions (usually with an S mint mark); circulating Ikes are copper-nickel and worth face value." },
    ],
  },
  {
    slug: "silver-bar-value-calculator",
    title: "Silver Bar Value Calculator",
    description: "Value silver bars from 1 oz to 1 kilogram at today's spot price, with the dealer premium to buy, the buyback price and the round-trip cost.",
    metaTitle: "Silver Bar Value Calculator — 1 oz to 1 kg Bars",
    metaDescription: "Free silver bar value calculator. Value 1 oz, 10 oz, 100 oz and 1 kg silver bars at spot, with dealer premium, buyback and round-trip cost.",
    calcInputs: [
      dropdown("barSize", "Bar Size", [["1 troy ounce", 0], ["5 troy ounces", 1], ["10 troy ounces", 2], ["100 troy ounces", 3], ["1 kilogram", 4]], 2),
      numberField("quantity", "Quantity", { default: 5, min: 1, max: 100000 }),
      currencyField("spotPrice", "Silver Spot Price per Troy Ounce", { default: 48, max: 10000, step: 0.05 }),
      percentField("premiumPercent", "Dealer Premium Over Spot", { default: 6, max: 100, step: 0.5 }),
      percentField("buybackPercent", "Dealer Buyback (% of Spot Value)", { default: 97, max: 110, step: 0.5 }),
    ],
    calcResult: { label: "Melt Value", format: "currency" },
    calcResults: [
      { key: "meltValue", label: "Silver Value at Spot", format: "currency", highlight: true },
      { key: "costToBuy", label: "Cost to Buy", format: "currency" },
      { key: "buybackValue", label: "Dealer Buyback", format: "currency" },
      { key: "roundTripCost", label: "Round-Trip Cost", format: "currency" },
      { key: "silverOunces", label: "Silver (oz)", format: "number" },
    ],
    instructions:
      "Choose the bar size and quantity, today's silver spot price, and the dealer's premium and buyback rate.",
    examples: "Example: five 10 oz bars hold 49.95 oz of silver, worth $2,397.60 at $48. With a 6% premium they cost $2,541.46; selling back at 97% returns $2,325.67.",
    assumptions: "Bars are valued at 99.9% purity. Premiums are higher on small bars and in times of high demand; 100 oz and 1 kg bars usually have the lowest premiums per ounce. Sales tax may apply in some states. " + SPOT_NOTE,
    faq: [
      { question: "What size silver bar is best?", answer: "10 oz and 100 oz bars have low premiums per ounce; 1 oz bars are easier to sell in small amounts." },
      { question: "How much do dealers pay for silver bars?", answer: "Usually around spot, sometimes a little under or over, depending on the brand and market demand." },
    ],
  },
  {
    slug: "silver-quarter-value-calculator",
    title: "Silver Quarter Value Calculator",
    description: "Find what pre-1965 90% silver quarters are worth at today's silver price — per quarter, for your whole stack and as a multiple of face value.",
    metaTitle: "Silver Quarter Value Calculator — Pre-1965",
    metaDescription: "Free silver quarter value calculator. Find the melt value of pre-1965 90% silver Washington quarters, per coin and for a stack.",
    calcInputs: [
      numberField("quarters", "Number of Pre-1965 Quarters", { default: 40, max: 1000000 }),
      currencyField("spotPrice", "Silver Spot Price per Troy Ounce", { default: 48, max: 10000, step: 0.05 }),
      percentField("dealerPercent", "Dealer Offer (% of Melt)", { default: 92, max: 110, step: 1 }),
    ],
    calcResult: { label: "Melt Value", format: "currency" },
    calcResults: [
      { key: "meltValue", label: "Melt Value", format: "currency", highlight: true },
      { key: "valuePerQuarter", label: "Value per Quarter", format: "currency" },
      { key: "dealerOffer", label: "Likely Dealer Offer", format: "currency" },
      { key: "silverOunces", label: "Silver Content (oz)", format: "number", decimals: 4 },
      { key: "timesFaceValue", label: "Times Face Value", format: "number" },
    ],
    instructions:
      "Count your quarters dated 1964 or earlier (and Bicentennial 40% silver proofs separately) and enter today's silver price. Quarters from 1965 on are copper-nickel clad and worth 25¢ unless rare.",
    examples: "Example: 40 pre-1965 quarters ($10 face) contain 7.2336 oz of silver — $347.21 at $48 an ounce, or $8.68 each, about 34.72 times face value.",
    assumptions: "Each 90% silver quarter contains 0.18084 troy oz of silver when new; worn coins slightly less. Look at the edge: silver quarters have a solid silver-coloured edge, clad quarters show a copper stripe. " + SPOT_NOTE,
    faq: [
      { question: "What years are quarters silver?", answer: "Washington quarters dated 1964 and earlier are 90% silver. Some 1976 Bicentennial collector quarters are 40% silver." },
      { question: "How much is a silver quarter worth?", answer: "About 0.18 troy oz × the silver price — roughly $8–$9 at $48 an ounce." },
    ],
  },
  {
    slug: "sterling-silver-flatware-value-calculator",
    title: "Sterling Silver Flatware Value Calculator",
    description: "Estimate the scrap and replacement value of a sterling silver flatware set from the number of forks, spoons, hollow-handle knives and serving pieces.",
    metaTitle: "Sterling Silver Flatware Value Calculator — Sets",
    metaDescription: "Free sterling silver flatware value calculator. Estimate scrap and replacement value of forks, spoons, knives and serving pieces.",
    calcInputs: [
      numberField("forks", "Forks", { default: 16, max: 1000 }),
      numberField("forkGrams", "Average Fork Weight", { unit: "g", default: 45, max: 300, step: 1 }),
      numberField("spoons", "Spoons", { default: 16, max: 1000 }),
      numberField("spoonGrams", "Average Spoon Weight", { unit: "g", default: 38, max: 300, step: 1 }),
      numberField("knives", "Hollow-Handle Knives", { default: 8, max: 1000, required: false }),
      numberField("servingPieces", "Serving Pieces", { default: 4, max: 1000, required: false }),
      numberField("servingGrams", "Average Serving Piece Weight", { unit: "g", default: 75, max: 1000, step: 1, required: false }),
      currencyField("spotPrice", "Silver Spot Price per Troy Ounce", { default: 48, max: 10000, step: 0.05 }),
      percentField("payoutPercent", "Scrap Buyer Payout (% of Melt)", { default: 75, max: 100, step: 1 }),
      numberField("replacementMultiple", "Replacement Value ÷ Melt", { default: 3, min: 1, max: 10, step: 0.5, required: false }),
    ],
    calcResult: { label: "Melt Value", format: "currency" },
    calcResults: [
      { key: "meltValue", label: "Silver Melt Value", format: "currency", highlight: true },
      { key: "buyerOffer", label: "Likely Scrap Offer", format: "currency" },
      { key: "replacementValueEstimate", label: "Rough Replacement / Resale Value", format: "currency" },
      { key: "sterlingWeightGrams", label: "Sterling Weight (g)", format: "number" },
      { key: "pureSilverOunces", label: "Pure Silver (oz)", format: "number", decimals: 4 },
    ],
    instructions:
      "Count the forks, spoons, knives and serving pieces, and weigh one fork and one spoon to get average weights. Hollow-handle knives are counted at about 15 g of silver each because the blade is steel and the handle is filled.",
    examples: "Example: a 44-piece set with 16 forks, 16 spoons, 8 knives and 4 serving pieces holds 1,748 g of sterling — a melt value of $2,495.26 at $48 an ounce. Sold as a set to a collector it might fetch around $7,485.77.",
    assumptions: "Sterling is 92.5% silver. Popular patterns sold through replacement services or to collectors often bring 2–5× melt; scrap buyers pay 70–90% of melt. Silver-plated flatware has almost no scrap value. " + SPOT_NOTE,
    faq: [
      { question: "How much is a sterling silver flatware set worth?", answer: "A full service for 8–12 is often 1,500–3,000 g of sterling — worth thousands at melt, and more to pattern collectors." },
      { question: "Why do knives count for less silver?", answer: "Most sterling dinner knives have stainless steel blades and hollow handles filled with cement, so only the thin handle shell is silver." },
    ],
  },
  {
    slug: "platinum-value-calculator",
    title: "Platinum Value Calculator",
    description: "Find the melt value of platinum jewelry, rings and scrap by weight and purity (950, 900, 850 or 999), minus stones, at today's platinum price.",
    metaTitle: "Platinum Value Calculator — Rings & Scrap",
    metaDescription: "Free platinum value calculator. Find the melt value of platinum rings, jewelry and scrap by weight and purity at today's platinum price.",
    calcInputs: [
      numberField("weight", "Weight", { default: 8, max: 100000, step: 0.01 }),
      dropdown("unit", "Unit", [["Grams", 0], ["Pennyweight", 1], ["Troy ounces", 2]], 0),
      dropdown("purity", "Purity (Stamp)", [["950 Plat / Pt950 (95%)", 0], ["900 Plat (90%)", 1], ["850 Plat (85%)", 2], ["999 bullion", 3]], 0),
      numberField("stoneCarats", "Stone Weight to Deduct", { unit: "ct", default: 0, max: 50, step: 0.05, required: false }),
      currencyField("spotPrice", "Platinum Spot Price per Troy Ounce", { default: 1600, max: 100000, step: 1 }),
      percentField("payoutPercent", "Buyer Payout (% of Melt)", { default: 80, max: 100, step: 1 }),
    ],
    calcResult: { label: "Melt Value", format: "currency" },
    calcResults: [
      { key: "meltValue", label: "Platinum Melt Value", format: "currency", highlight: true },
      { key: "buyerOffer", label: "Likely Buyer Offer", format: "currency" },
      { key: "purePlatinumGrams", label: "Pure Platinum (g)", format: "number", decimals: 3 },
      { key: "valuePerGram", label: "Value per Gram of Item", format: "currency" },
    ],
    instructions:
      "Weigh the platinum piece and choose the purity stamp (most US jewelry is 950). Deduct any stones, then enter today's platinum spot price and the buyer's payout.",
    examples: "Example: an 8 g Pt950 wedding band contains 7.6 g of platinum, worth $390.95 at $1,600 an ounce — about $312.76 from a buyer.",
    assumptions: "Purity: 950 = 95%, 900 = 90%, 850 = 85%. Stones are deducted at 0.2 g per carat. Platinum is denser than gold, so platinum rings feel heavier. Refiners may pay less for platinum than gold because fewer buyers handle it. " + SPOT_NOTE,
    faq: [
      { question: "How much is a platinum ring worth?", answer: "Its melt value is the weight in grams × purity × the platinum price per gram; a typical 6–10 g band is worth a few hundred dollars." },
      { question: "Is platinum worth more than gold?", answer: "Not currently — platinum trades well below gold per ounce, though platinum jewelry costs more to make." },
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
