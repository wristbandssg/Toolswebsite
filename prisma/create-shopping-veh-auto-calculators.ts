// One-time (but safe to re-run) batch setup script: creates 6 salvage, classic car and resale tools
// from the user's shopping list (Shopping Calculators > Vehicle, Resale & Collectibles Calculators).
// See src/lib/calc-engine-shopping-veh-auto.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-veh-auto-calculators.ts
// or
//   npm run db:create-shopping-veh-auto-calculators

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

const TOOLS: ToolDef[] = [
  {
    slug: "scrap-car-value-calculator",
    title: "Scrap Car Value Calculator",
    description: "Estimate what a junkyard should pay for your scrap car — curb weight times the scrap price per ton, plus the catalytic converter and sellable parts, minus towing.",
    metaTitle: "Scrap Car Value Calculator — Junk Car Price",
    metaDescription: "Free scrap car value calculator. Estimate a junk car's value from curb weight and scrap price per ton plus catalytic converter and parts.",
    calcInputs: [
      numberField("curbWeightLb", "Curb Weight", { unit: "lb", default: 3200, max: 15000, step: 10 }),
      currencyField("pricePerTon", "Scrap Price per Ton (Whole Car)", { default: 200, max: 1000 }),
      currencyField("catalyticValue", "Catalytic Converter Value", { default: 150, max: 3000, required: false }),
      currencyField("partsValue", "Other Sellable Parts", { default: 0, max: 20000, required: false }),
      currencyField("towingFee", "Towing Fee Deducted", { default: 0, max: 500, required: false }),
    ],
    calcResult: { label: "Net Offer", format: "currency" },
    calcResults: [
      { key: "netOffer", label: "Expected Scrap Offer", format: "currency", highlight: true },
      { key: "metalValue", label: "Metal Value by Weight", format: "currency" },
      { key: "partsValue", label: "Converter & Parts Value", format: "currency" },
      { key: "weightTons", label: "Weight (US Tons)", format: "number" },
      { key: "pricePerLb", label: "Scrap Price per lb", format: "currency", decimals: 3 },
    ],
    instructions: "Find the curb weight on the driver's door sticker or online, call a local yard for its current price per ton for whole cars, and add the catalytic converter and any parts with resale value (alloy wheels, new tires, battery).",
    examples: "Example: a 3,200 lb car at $200 per ton is worth $320.00 in metal; with a $150 converter, expect an offer around $470.00.",
    assumptions: "Whole-car scrap prices in 2026 commonly run about $150–$300 per ton and move with steel markets. Yards may deduct for missing parts, fluids or towing. Converters are worth roughly $50–$1,000+ depending on the vehicle. A running car is usually worth more sold to a private buyer.",
    faq: [
      { question: "How much is a junk car worth?", answer: "Most junk cars bring about $250–$600, more for heavier vehicles and valuable catalytic converters." },
      { question: "Do I need a title to scrap a car?", answer: "Usually yes — most states require a title or other proof of ownership to scrap a vehicle." },
    ],
  },
  {
    slug: "totaled-car-value-calculator",
    title: "Totaled Car Value Calculator",
    description: "Estimate your insurance payout for a totaled car — actual cash value plus tax and fees minus your deductible — what's left after paying off your loan, and the payout if you keep the car.",
    metaTitle: "Totaled Car Value Calculator — Insurance Payout",
    metaDescription: "Free totaled car calculator. Estimate the insurance payout for a total loss, loan gap, keep-the-car payout and total-loss threshold.",
    calcInputs: [
      currencyField("actualCashValue", "Actual Cash Value Before the Accident", { default: 18000, max: 500000 }),
      currencyField("repairEstimate", "Repair Estimate", { default: 15000, max: 500000 }),
      percentField("thresholdPercent", "State Total-Loss Threshold", { default: 75, min: 50, max: 100 }),
      currencyField("deductible", "Your Deductible", { default: 500, max: 10000 }),
      percentField("salesTaxRate", "Sales Tax Paid on Total Loss", { default: 6, max: 15, required: false }),
      currencyField("titleFees", "Title & Registration Fees Paid", { default: 150, max: 2000, required: false }),
      currencyField("loanBalance", "Loan Balance", { default: 12000, max: 500000, required: false }),
      percentField("salvagePercent", "Salvage Value (If You Keep the Car)", { default: 20, max: 50, required: false }),
    ],
    calcResult: { label: "Insurance Payout", format: "currency" },
    calcResults: [
      { key: "insurancePayout", label: "Estimated Insurance Payout", format: "currency", highlight: true },
      { key: "afterLoanPayoff", label: "Left After Paying Off the Loan (Negative = Gap)", format: "currency" },
      { key: "keepCarPayout", label: "Payout if You Keep the Car", format: "currency" },
      { key: "salvageValue", label: "Salvage Value Deducted", format: "currency" },
      { key: "isTotalLoss", label: "Likely a Total Loss? (1 = Yes)", format: "number" },
      { key: "repairPercentOfValue", label: "Repairs as % of Value", format: "percentage" },
    ],
    instructions: "Enter the car's pre-accident value (check comparable listings, not just the insurer's figure), the repair estimate, your state's threshold (often 60–80%), deductible, tax and fees your state requires insurers to pay, and your loan balance.",
    examples: "Example: an $18,000 car with $15,000 of damage is a total loss at a 75% threshold; the payout is about $18,730.00, leaving $6,730.00 after a $12,000 loan.",
    assumptions: "Many states require insurers to include sales tax and title fees in total-loss settlements. Some states use a total-loss formula (repairs + salvage ≥ value) instead of a percentage. If you owe more than the payout, gap insurance covers the difference. Keeping the car usually means a salvage title.",
    faq: [
      { question: "How do insurance companies value a totaled car?", answer: "They estimate actual cash value from recent sales of similar cars, adjusted for mileage, options and condition — you can dispute it with your own comparables." },
      { question: "Can I keep my totaled car?", answer: "Often yes — the insurer deducts the salvage value from your payout, and the car gets a salvage or rebuilt title." },
    ],
  },
  {
    slug: "classic-car-value-calculator",
    title: "Classic Car Value Calculator",
    description: "Estimate a classic car's value from a price-guide figure — adjusted for condition class (#1 concours to project), originality and documentation — with agreed insurance value and future value.",
    metaTitle: "Classic Car Value Calculator — Condition Classes",
    metaDescription: "Free classic car value calculator. Adjust a price-guide value for condition #1–#4, originality and documentation, with future value.",
    calcInputs: [
      currencyField("guideValue", "Price Guide Value in #3 Good Condition", { default: 40000, max: 10000000 }),
      dropdown("conditionClass", "Condition Class", [["#1 Concours", 1.6], ["#2 Excellent", 1.3], ["#3 Good (driver)", 1], ["#4 Fair", 0.6], ["Project car", 0.3]], 1.3),
      dropdown("originality", "Originality", [["Numbers-matching original", 1.1], ["Correct restoration", 1], ["Restomod (modern drivetrain)", 0.95], ["Modified / non-original", 0.8]], 1),
      dropdown("documentation", "Documentation", [["Full history, build sheet, receipts", 1.05], ["Some records", 1], ["None", 0.95]], 1),
      percentField("appreciationRate", "Expected Appreciation per Year", { default: 3, min: -10, max: 20, required: false }),
      numberField("years", "Years Ahead", { default: 5, max: 50, required: false }),
      percentField("auctionFee", "Auction Seller Fee", { default: 8, max: 20, required: false }),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Market Value", format: "currency", highlight: true },
      { key: "agreedInsuranceValue", label: "Suggested Agreed Insurance Value", format: "currency" },
      { key: "futureValue", label: "Projected Future Value", format: "currency" },
      { key: "auctionNet", label: "Net After Auction Fees", format: "currency" },
      { key: "gainOverPeriod", label: "Projected Gain", format: "currency" },
    ],
    instructions: "Look up the #3 (good driver) value for the exact year, model and engine in a guide like Hagerty, then choose the car's condition class, originality and paperwork. Add an appreciation rate to project future value.",
    examples: "Example: a car with a $40,000 #3 guide value in #2 excellent condition is worth about $52,000.00; insure it for about $57,200.00 on an agreed-value policy.",
    assumptions: "Condition classes: #1 concours (best in the world), #2 excellent show car, #3 good driver, #4 fair with flaws. Multipliers are typical spreads; rare options, colors and racing history can add far more. Market values change — check recent auction results.",
    faq: [
      { question: "What do classic car condition ratings mean?", answer: "#1 is concours-perfect, #2 is an excellent show car, #3 is a good driver with minor flaws and #4 is a running car that needs work." },
      { question: "Should I insure my classic car for agreed value?", answer: "Yes — an agreed-value policy pays the set amount if the car is totaled, instead of a depreciated cash value." },
    ],
  },
  {
    slug: "scrap-metal-value-calculator",
    title: "Scrap Metal Value Calculator",
    description: "Estimate what your scrap metal is worth — copper, brass, aluminum, stainless, lead, steel or car batteries — by weight, using typical yard prices or your local price.",
    metaTitle: "Scrap Metal Value Calculator — Price per Pound",
    metaDescription: "Free scrap metal value calculator. Estimate scrap value for copper, brass, aluminum, steel and more by weight and price per pound.",
    calcInputs: [
      dropdown("metal", "Metal", [["Copper #1 (bare bright)", 3.8], ["Copper #2", 3.4], ["Insulated copper wire", 1.2], ["Brass (yellow)", 2.3], ["Aluminum cans", 0.5], ["Aluminum sheet / cast", 0.6], ["Stainless steel", 0.45], ["Lead", 0.7], ["Car batteries", 0.2], ["Steel / iron (light)", 0.08]], 2.3),
      numberField("weightLb", "Weight", { unit: "lb", default: 50, max: 100000, step: 0.5 }),
      currencyField("customPrice", "Your Yard's Price per lb (0 = Typical)", { default: 0, max: 20, step: 0.01, required: false }),
    ],
    calcResult: { label: "Scrap Value", format: "currency" },
    calcResults: [
      { key: "scrapValue", label: "Estimated Scrap Value", format: "currency", highlight: true },
      { key: "pricePerLb", label: "Price per lb Used", format: "currency" },
      { key: "pricePerKg", label: "Price per kg", format: "currency" },
      { key: "pricePerTon", label: "Price per US Ton", format: "currency" },
      { key: "weightKg", label: "Weight (kg)", format: "number" },
    ],
    instructions: "Sort your metal by type (a magnet sticks to steel and iron, not to copper, brass, aluminum or most stainless), weigh it, and enter your yard's posted price per pound if you have it.",
    examples: "Example: 50 lb of yellow brass at a typical $2.30 per lb is worth about $115.00.",
    assumptions: "Typical 2026 US scrap yard prices; they track commodity markets and vary by region and yard. Clean, sorted metal (no steel attached, plastic stripped) earns the top price. Some states require ID and hold payments for copper.",
    faq: [
      { question: "What scrap metal is worth the most?", answer: "Copper, especially clean bare bright wire, followed by brass and insulated copper wire." },
      { question: "How can I tell what metal I have?", answer: "Use a magnet: ferrous metals (steel, iron) stick and are worth little; non-ferrous metals don't stick and pay much more." },
    ],
  },
  {
    slug: "garage-sale-pricing-calculator",
    title: "Garage Sale Pricing Calculator",
    description: "Price items for a garage or yard sale from their original price, category and condition — with friendly sticker prices, the lowest you should accept and expected totals.",
    metaTitle: "Garage Sale Pricing Calculator — Yard Sale Prices",
    metaDescription: "Free garage sale pricing calculator. Find yard sale sticker prices from original price, category and condition, plus your lowest offer.",
    calcInputs: [
      currencyField("originalPrice", "Original Retail Price", { default: 60, max: 100000 }),
      dropdown("category", "Category", [["Clothing & shoes", 0.1], ["Books, DVDs & toys", 0.12], ["Kitchen & home decor", 0.15], ["Electronics", 0.2], ["Furniture", 0.25], ["Tools & sports gear", 0.35], ["Collectibles & antiques", 0.5]], 0.2),
      dropdown("condition", "Condition", [["New / unused", 1.4], ["Like new", 1.15], ["Good", 1], ["Fair / well used", 0.6]], 1),
      percentField("negotiationRoom", "Room to Haggle", { default: 25, max: 75 }),
      numberField("quantity", "Number of Similar Items", { default: 1, min: 1, max: 1000 }),
    ],
    calcResult: { label: "Sticker Price", format: "currency" },
    calcResults: [
      { key: "stickerPrice", label: "Sticker Price", format: "currency", highlight: true },
      { key: "lowestToAccept", label: "Lowest Price to Accept", format: "currency" },
      { key: "percentOfRetail", label: "Sticker as % of Retail", format: "percentage" },
      { key: "totalIfAllSell", label: "Total if All Sell at Sticker", format: "currency" },
      { key: "totalAtLowest", label: "Total at Lowest Prices", format: "currency" },
    ],
    instructions: "Enter what the item cost new, its category and condition, and how much room you want to haggle. Prices round to easy amounts (quarters under $1, half-dollars under $10).",
    examples: "Example: a $60 electronic item in good condition gets a $12.00 sticker, and you can accept as little as $9.00.",
    assumptions: "Garage sale rule of thumb: 10–30% of retail for most items, more for tools, collectibles and new-in-box items. Buyers expect to haggle, especially late in the day — consider half-price after noon. Big-ticket items may sell better online.",
    faq: [
      { question: "How should I price things for a garage sale?", answer: "A common rule is 10–30% of the original price for items in good condition, rounded to simple amounts." },
      { question: "What sells best at garage sales?", answer: "Furniture, tools, kids' items, kitchenware and outdoor and sports gear usually sell fastest." },
    ],
  },
  {
    slug: "resale-profit-calculator",
    title: "Resale Profit Calculator",
    description: "Calculate your profit from flipping or reselling an item — after purchase price, cleanup or repairs, platform and payment fees and shipping — with ROI, margin, hourly profit and break-even price.",
    metaTitle: "Resale Profit Calculator — Flipping ROI",
    metaDescription: "Free resale profit calculator. Find flipping profit after fees and shipping, with ROI, margin, profit per hour and break-even price.",
    calcInputs: [
      currencyField("buyPrice", "Purchase Price", { default: 25, max: 1000000 }),
      currencyField("prepCost", "Cleaning / Repairs / Parts", { default: 5, max: 100000, required: false }),
      currencyField("salePrice", "Sale Price", { default: 80, max: 1000000 }),
      percentField("platformFee", "Platform Selling Fee", { default: 13.25, max: 50, required: false }),
      percentField("paymentFee", "Payment Processing Fee", { default: 0, max: 10, required: false }),
      currencyField("fixedFee", "Fixed Fee per Order", { default: 0.4, max: 50, step: 0.05, required: false }),
      currencyField("shippingCost", "Shipping You Pay", { default: 10, max: 10000, required: false }),
      numberField("hours", "Hours Spent (Sourcing, Listing, Shipping)", { default: 1.5, max: 1000, step: 0.25, required: false }),
    ],
    calcResult: { label: "Net Profit", format: "currency" },
    calcResults: [
      { key: "netProfit", label: "Net Profit", format: "currency", highlight: true },
      { key: "roiPercent", label: "Return on Investment (%)", format: "percentage" },
      { key: "profitMargin", label: "Profit Margin (%)", format: "percentage" },
      { key: "totalFees", label: "Total Fees", format: "currency" },
      { key: "profitPerHour", label: "Profit per Hour", format: "currency" },
      { key: "breakEvenPrice", label: "Break-Even Sale Price", format: "currency" },
    ],
    instructions: "Enter what you paid, any cleanup or repair costs, your expected sale price, your platform's fees (eBay about 13%, Poshmark 20% over $15, Mercari or Depop vary) and shipping you cover, plus the time you spent.",
    examples: "Example: buying for $25, spending $5 on cleanup and selling for $80 on eBay with $10 shipping leaves $29.00 profit — a 96.67% return, or $19.33 an hour.",
    assumptions: "Fees are charged on the sale price (some platforms also charge on shipping and tax). ROI = profit ÷ (purchase + prep costs); margin = profit ÷ sale price. Income from regular flipping is taxable as business income.",
    faq: [
      { question: "What is a good ROI for reselling?", answer: "Many resellers aim for at least 100% ROI (doubling their money) or $10–$20+ profit per item to make the time worthwhile." },
      { question: "Do I have to pay taxes on resale profit?", answer: "Yes — profit from buying to resell is taxable income, and platforms issue 1099-K forms above reporting thresholds." },
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
