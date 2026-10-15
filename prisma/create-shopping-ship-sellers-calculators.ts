// One-time (but safe to re-run) batch setup script: creates 5 marketplace seller shipping tools
// from the user's shopping list (Shopping Calculators > Shipping & Moving Cost Calculators).
// See src/lib/calc-engine-shopping-ship-sellers.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-ship-sellers-calculators.ts
// or
//   npm run db:create-shopping-ship-sellers-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Shipping & Moving Cost Calculators", slug: "shipping-moving-cost-calculators" };

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

const SDIMS = (l: number, w: number, h: number) => [
  numberField("length", "Box Length", { unit: "in", default: l, max: 108, step: 0.5 }),
  numberField("width", "Box Width", { unit: "in", default: w, max: 108, step: 0.5 }),
  numberField("height", "Box Height", { unit: "in", default: h, max: 108, step: 0.5 }),
];
const RESALE_INPUTS = (tiers: [string, number][], def: number, sellingFee: number, rate: number, fixed: number) => [
  currencyField("salePrice", "Sale Price", { default: 40, max: 100000 }),
  dropdown("labelTier", "Package Weight (Typical Prepaid Label)", tiers, def),
  dropdown("buyerPaysShipping", "Who Pays Shipping", [["Seller (free shipping)", 0], ["Buyer", 1]], 1),
  percentField("sellingFee", "Selling Fee", { default: sellingFee, max: 30, required: false }),
  percentField("processingRate", "Payment Processing Rate", { default: rate, max: 10 }),
  currencyField("processingFixed", "Payment Processing Fixed Fee", { default: fixed, max: 5, step: 0.01, required: false }),
  currencyField("itemCost", "What You Paid for the Item", { default: 10, max: 100000, required: false }),
];
const RESALE_RESULTS = [
  { key: "netPayout", label: "Your Net Payout", format: "currency", highlight: true },
  { key: "labelCost", label: "Shipping Label Cost", format: "currency" },
  { key: "totalFees", label: "Selling & Processing Fees", format: "currency" },
  { key: "profit", label: "Profit After Item Cost", format: "currency" },
  { key: "shippingPercentOfSale", label: "Shipping as % of Sale Price", format: "percentage" },
];

const TOOLS: ToolDef[] = [
  {
    slug: "amazon-fba-shipping-cost-calculator",
    title: "Amazon FBA Shipping Cost Calculator",
    description: "Estimate Amazon FBA costs per unit — size tier, fulfillment fee, monthly storage and inbound shipping — from product dimensions and weight.",
    metaTitle: "Amazon FBA Shipping Cost Calculator — Fees",
    metaDescription: "Free Amazon FBA cost calculator. Estimate size tier, fulfillment fee, storage and inbound shipping cost per unit from size and weight.",
    calcInputs: [
      ...SDIMS(10, 8, 3),
      numberField("weightLb", "Packaged Unit Weight", { unit: "lb", default: 1.5, max: 150, step: 0.05 }),
      numberField("monthsStored", "Average Months in Storage", { default: 2, max: 24, step: 0.5 }),
      dropdown("peakSeason", "Storage Season", [["January–September", 0], ["October–December (peak)", 1]], 0),
      currencyField("inboundPerLb", "Inbound Shipping to Amazon per lb", { default: 0.35, max: 5, step: 0.01 }),
    ],
    calcResult: { label: "Total FBA Cost per Unit", format: "currency" },
    calcResults: [
      { key: "totalFbaCostPerUnit", label: "Total FBA Cost per Unit", format: "currency", highlight: true },
      { key: "fulfillmentFee", label: "Fulfillment Fee", format: "currency" },
      { key: "sizeTier", label: "Size Tier (1 = Small Std, 2 = Large Std, 3 = Large Bulky)", format: "number" },
      { key: "shippingWeightLb", label: "Shipping Weight Used (lb)", format: "number" },
      { key: "storageFeePerUnit", label: "Storage Fees per Unit", format: "currency" },
      { key: "inboundCostPerUnit", label: "Inbound Shipping per Unit", format: "currency" },
    ],
    instructions: "Enter the packaged product's dimensions and weight, how long a unit typically sits in Amazon's warehouse, the season, and your cost per pound to send inventory to Amazon (partnered carrier and placement fees).",
    examples: "Example: a 10 × 8 × 3 in product weighing 1.5 lb is large standard (tier 2) with a fulfillment fee of about $5.49 — $6.31 per unit including two months of storage and inbound shipping.",
    assumptions: "Size tiers: small standard up to 15 × 12 × 0.75 in and 1 lb; large standard up to 18 × 14 × 8 in and 20 lb; larger is bulky. Large items bill on the greater of unit and dimensional weight (÷ 139). Fees approximate Amazon's 2025–2026 US schedule for items priced $10–$50; check Seller Central's revenue calculator, as fees change yearly. Referral fees (usually 15%) are separate.",
    faq: [
      { question: "How much does Amazon FBA cost per item?", answer: "Fulfillment fees run about $3–$4 for small light items, $4–$9 for typical large standard items and $10+ for bulky ones, plus storage and referral fees." },
      { question: "How can I lower FBA fees?", answer: "Shrink packaging to drop a size tier or weight band, keep inventory turning fast to avoid storage and aged fees, and send inventory in bigger batches." },
    ],
  },
  {
    slug: "ebay-shipping-cost-calculator",
    title: "eBay Shipping Cost Calculator",
    description: "Estimate an eBay shipping label — USPS Ground Advantage, Priority Mail or Media Mail at eBay's discounted rates — and what to charge buyers to cover the label, packaging and eBay's fee on shipping.",
    metaTitle: "eBay Shipping Cost Calculator — Label & Charge",
    metaDescription: "Free eBay shipping calculator. Estimate discounted eBay label cost by weight, size and zone and what to charge buyers for shipping.",
    calcInputs: [
      numberField("weightLb", "Packed Weight", { unit: "lb", default: 2, max: 70, step: 0.1 }),
      ...SDIMS(12, 9, 4),
      numberField("zone", "Shipping Zone (1–8)", { default: 5, min: 1, max: 8 }),
      dropdown("service", "Service", [["USPS Ground Advantage", 0], ["USPS Priority Mail", 1], ["USPS Media Mail (books, media)", 2]], 0),
      currencyField("packaging", "Packaging Cost", { default: 0.75, max: 50, step: 0.05, required: false }),
      percentField("feeRate", "eBay Final Value Fee (Applies to Shipping)", { default: 13.6, max: 20 }),
    ],
    calcResult: { label: "Label Cost", format: "currency" },
    calcResults: [
      { key: "labelCost", label: "eBay Label Cost", format: "currency", highlight: true },
      { key: "suggestedShippingCharge", label: "Shipping to Charge the Buyer", format: "currency" },
      { key: "retailPostOfficePrice", label: "Retail Post Office Price", format: "currency" },
      { key: "savingsVsRetail", label: "Savings vs Retail", format: "currency" },
      { key: "billableWeightLb", label: "Billable Weight (lb)", format: "number" },
    ],
    instructions: "Weigh the packed item, enter the box size and zone to the buyer (Zone 5 is a good average for calculated shipping), choose the service and add packaging cost.",
    examples: "Example: a 2 lb box going to zone 5 by Ground Advantage costs about $7.56 through eBay labels; charge about $9.61 to cover the label, packaging and eBay's fee on shipping.",
    assumptions: "Label prices approximate 2026 commercial (discounted) USPS rates; retail is about 28% higher. USPS charges dimensional weight (÷ 166) only for boxes over 1 cubic foot. eBay's final value fee (about 13.6% in most categories) applies to the total including shipping.",
    faq: [
      { question: "Does eBay charge fees on shipping?", answer: "Yes — eBay's final value fee is charged on the item price plus shipping and sales tax." },
      { question: "Should I offer free shipping on eBay?", answer: "It can boost visibility and conversions; build the label cost into your price so you don't lose margin." },
    ],
  },
  {
    slug: "etsy-shipping-cost-calculator",
    title: "Etsy Shipping Cost Calculator",
    description: "Estimate an Etsy shipping label and the shipping price that covers the label, packaging and Etsy's transaction and payment fees — or how much to raise prices for free shipping.",
    metaTitle: "Etsy Shipping Cost Calculator — Label & Pricing",
    metaDescription: "Free Etsy shipping calculator. Estimate Etsy label cost and the shipping price that covers fees, or the price bump for free shipping.",
    calcInputs: [
      numberField("weightOz", "Packed Weight", { unit: "oz", default: 10, max: 1120, step: 0.5 }),
      numberField("zone", "Shipping Zone (1–8)", { default: 5, min: 1, max: 8 }),
      dropdown("service", "Service", [["USPS Ground Advantage", 0], ["USPS Priority Mail", 1]], 0),
      currencyField("packaging", "Packaging Cost", { default: 0.8, max: 50, step: 0.05, required: false }),
      percentField("transactionFee", "Etsy Transaction Fee", { default: 6.5, max: 15 }),
      percentField("paymentFee", "Payment Processing (Percentage Part)", { default: 3, max: 10 }),
    ],
    calcResult: { label: "Recommended Shipping Charge", format: "currency" },
    calcResults: [
      { key: "recommendedShippingCharge", label: "Shipping Price to Charge", format: "currency", highlight: true },
      { key: "labelCost", label: "Etsy Label Cost", format: "currency" },
      { key: "feesOnShipping", label: "Etsy Fees on That Shipping Charge", format: "currency" },
      { key: "freeShippingPriceIncrease", label: "Price Increase for Free Shipping", format: "currency" },
    ],
    instructions: "Enter the packed weight in ounces, an average zone (5 works for nationwide buyers), service, packaging cost and your Etsy fees (6.5% transaction plus about 3% + $0.25 payment processing in the US).",
    examples: "Example: a 10 oz package by Ground Advantage costs about $6.99 on Etsy labels; charge $8.60 for shipping (or add that to the price for free shipping) to cover the label, packaging and fees.",
    assumptions: "Labels approximate Etsy's discounted 2026 USPS rates. Etsy's transaction fee and payment processing apply to shipping charges too, so the charge = (label + packaging) ÷ (1 − fee rates). Etsy prioritizes US listings with free shipping on orders of $35+.",
    faq: [
      { question: "Does Etsy take fees on shipping?", answer: "Yes — the 6.5% transaction fee and payment processing fee apply to what the buyer pays for shipping." },
      { question: "Should I offer free shipping on Etsy?", answer: "Often yes for US orders — build the shipping cost into the item price; Etsy favors free-shipping listings in search." },
    ],
  },
  {
    slug: "depop-shipping-calculator",
    title: "Depop Shipping Calculator",
    description: "Estimate Depop shipping label cost by package weight and your net payout after Depop's fees — whether you or the buyer pays shipping.",
    metaTitle: "Depop Shipping Calculator — Label & Payout",
    metaDescription: "Free Depop shipping calculator. Estimate the shipping label by weight and your payout after fees when you or the buyer pays shipping.",
    calcInputs: RESALE_INPUTS(
      [["Under 4 oz", 4.75], ["4–8 oz", 5.5], ["8–12 oz", 6.5], ["12 oz–1 lb", 7.25], ["1–2 lb", 9.5], ["2–3 lb", 11], ["3–5 lb", 14], ["5–10 lb", 19]],
      6.5, 0, 3.3, 0.45,
    ),
    calcResult: { label: "Net Payout", format: "currency" },
    calcResults: RESALE_RESULTS,
    instructions: "Enter the sale price, choose the package weight, and whether you offer free shipping. Keep Depop's current fees: in the US there's no selling fee on most new listings, but payment processing is about 3.3% + $0.45.",
    examples: "Example: a $40 sale weighing 8–12 oz with the buyer paying shipping nets you $38.23 after $1.77 in fees — $28.23 profit on a $10 item.",
    assumptions: "Label prices are typical Depop (USPS) prepaid label prices by weight band in 2026 and may differ by region and promotion. Fees: US 0% selling fee and 3.3% + $0.45 payment processing; UK listings differ. When the seller pays shipping, the label is deducted from the payout.",
    faq: [
      { question: "How much is Depop shipping?", answer: "Most clothing ships for about $5–$10 with a Depop label, depending on the package weight." },
      { question: "Who pays shipping on Depop?", answer: "The seller decides — buyers pay by default, but offering free shipping (built into the price) can help items sell faster." },
    ],
  },
  {
    slug: "mercari-shipping-calculator",
    title: "Mercari Shipping Calculator",
    description: "Estimate Mercari's prepaid shipping label by package weight and your net payout after Mercari's selling and payment processing fees — with or without free shipping.",
    metaTitle: "Mercari Shipping Calculator — Label & Payout",
    metaDescription: "Free Mercari shipping calculator. Estimate prepaid label cost by weight and your payout after selling and processing fees.",
    calcInputs: RESALE_INPUTS(
      [["Up to 4 oz", 5.5], ["4–8 oz", 6.25], ["8–12 oz", 7.25], ["12 oz–1 lb", 8], ["1–2 lb", 10.5], ["2–3 lb", 12], ["3–5 lb", 15], ["5–10 lb", 20.5]],
      7.25, 10, 2.9, 0.5,
    ),
    calcResult: { label: "Net Payout", format: "currency" },
    calcResults: RESALE_RESULTS,
    instructions: "Enter the sale price, pick the package weight band, and choose whether you or the buyer pays shipping. Update the fees to Mercari's current schedule if it changes.",
    examples: "Example: a $40 item weighing 8–12 oz with buyer-paid shipping nets $34.34 after $5.66 in fees; if you offered free shipping, the $7.25 label would come out of your payout too.",
    assumptions: "Label prices are typical Mercari prepaid label prices by weight in 2026 (USPS, UPS or FedEx) and change with promotions. Fees default to a 10% selling fee plus 2.9% + $0.50 payment processing; Mercari has changed its fee model several times, so check the current one.",
    faq: [
      { question: "How much does Mercari shipping cost?", answer: "Prepaid labels commonly run about $5.50–$12 for items under 3 lb, rising for heavier packages." },
      { question: "Should I offer free shipping on Mercari?", answer: "Free-shipping listings often sell faster; raise the price by about the label cost to keep your profit." },
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
