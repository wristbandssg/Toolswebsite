// One-time (but safe to re-run) batch setup script: creates 12 discount and deal tools
// from the user's shopping list (Shopping Calculators > Discount, Tip & Unit Price Calculators).
// See src/lib/calc-engine-shopping-deal-discounts.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-deal-discounts-calculators.ts
// or
//   npm run db:create-shopping-deal-discounts-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Discount, Tip & Unit Price Calculators", slug: "discount-tip-unit-price-calculators" };

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
    slug: "double-discount-calculator",
    title: "Double Discount Calculator",
    description: "Calculate the final price when two or three discounts are stacked — like 20% off plus an extra 10% — and the real combined discount, which is less than the percentages added up.",
    metaTitle: "Double Discount Calculator — Stacked % Off",
    metaDescription: "Free double discount calculator. Apply two or three stacked discounts in a row, find the final price and the true combined percentage off.",
    calcInputs: [
      currencyField("price", "Original Price", { default: 120, max: 1000000, step: 0.01 }),
      percentField("discount1", "First Discount", { default: 30, max: 100, step: 1 }),
      percentField("discount2", "Extra Discount", { default: 20, max: 100, step: 1 }),
      percentField("discount3", "Third Discount (Optional)", { default: 0, max: 100, step: 1, required: false }),
      percentField("taxRate", "Sales Tax", { default: 0, max: 20, step: 0.01, required: false }),
    ],
    calcResult: { label: "Final Price", format: "currency" },
    calcResults: [
      { key: "finalPrice", label: "Final Price", format: "currency", highlight: true },
      { key: "totalSavings", label: "Total Savings", format: "currency" },
      { key: "combinedDiscount", label: "Real Combined Discount", format: "percentage" },
      { key: "ifPercentagesAdded", label: "If You Just Added the Percentages", format: "percentage" },
      { key: "finalWithTax", label: "Final Price With Tax", format: "currency" },
    ],
    instructions:
      "Enter the original price and the discounts in the order they're applied — for example 30% off the ticket price, then an extra 20% at the register.\n\n" +
      "Add a third discount (like a coupon) and sales tax if needed.",
    examples: "Example: a $120 jacket at 30% off with an extra 20% off. The final price is $67.20 — a real discount of 44.00%, not the 50.00% you'd get by adding the two.",
    assumptions: "Each discount applies to the price left after the one before, so the order doesn't change the result. A dollar-off coupon is different: it subtracts a fixed amount, so its position matters.",
    faq: [
      { question: "Is 30% off plus 20% off the same as 50% off?", answer: "No. The second discount comes off the already-reduced price, so 30% + 20% is 44% off in total." },
      { question: "How do you calculate a double discount?", answer: "Multiply the price by (1 − first discount) and then by (1 − second discount). The combined discount is 1 minus those two factors multiplied together." },
    ],
  },
  {
    slug: "bogo-calculator",
    title: "BOGO Calculator",
    description: "Work out what you really pay with buy-one-get-one deals — BOGO free, BOGO 50% off, buy 2 get 1 free or any buy X get Y offer — and the real discount per item.",
    metaTitle: "BOGO Calculator — Buy One Get One & B2G1 Deals",
    metaDescription: "Free BOGO calculator. Work out the total, savings and real discount for buy one get one free, BOGO 50% off, buy 2 get 1 free and other deals.",
    calcInputs: [
      currencyField("itemPrice", "Price per Item", { default: 24.99, max: 100000, step: 0.01 }),
      numberField("cartQty", "Items in Your Cart", { default: 6, max: 1000 }),
      numberField("buyQty", "Buy (X)", { default: 2, min: 1, max: 20 }),
      numberField("getQty", "Get (Y)", { default: 1, min: 1, max: 20 }),
      percentField("getDiscount", "Discount on the 'Get' Items", { default: 100, max: 100, step: 5 }),
    ],
    calcResult: { label: "Total Price", format: "currency" },
    calcResults: [
      { key: "totalPrice", label: "Total Price", format: "currency", highlight: true },
      { key: "savings", label: "You Save", format: "currency" },
      { key: "effectiveDiscount", label: "Real Discount on Everything", format: "percentage" },
      { key: "pricePerItem", label: "Average Price per Item", format: "currency" },
      { key: "discountedItems", label: "Free or Discounted Items", format: "number" },
    ],
    instructions:
      "Enter the item price and how many you're buying, then the deal: buy X, get Y at a discount. BOGO free is buy 1, get 1 at 100% off; BOGO half off is 50%; buy 2 get 1 free is X = 2, Y = 1, 100%.\n\n" +
      "If items have different prices, use the price of the cheaper ones — stores usually discount the lowest-priced item.",
    examples: "Example: buy 2 get 1 free on six $24.99 items. Two items are free, so you pay $99.96 and save $49.98 — a real discount of 33.33%, or $16.66 per item.",
    assumptions: "Assumes every item costs the same and the deal repeats for every full group. Partial groups get no discount unless they include enough items to reach a 'get' item. Store rules can differ, such as limits per customer.",
    faq: [
      { question: "Is BOGO free the same as 50% off?", answer: "Only if you buy an even number of items at the same price. Buy one at BOGO and you pay full price; at 50% off you'd pay half." },
      { question: "What is buy 2 get 1 free as a percentage?", answer: "33.3% off when you buy three items of the same price." },
      { question: "Which item is free in a BOGO deal?", answer: "Usually the cheapest item, or one of equal or lesser value, so pair items of similar price." },
    ],
  },
  {
    slug: "free-shipping-threshold-calculator",
    title: "Free Shipping Threshold Calculator",
    description: "See how much more to spend to get free shipping, how many filler items you'd need, and whether adding them costs more than just paying for shipping.",
    metaTitle: "Free Shipping Threshold Calculator — Add or Pay?",
    metaDescription: "Free shipping threshold calculator. See how much to add to reach free shipping and whether a filler item is cheaper than paying the shipping fee.",
    calcInputs: [
      currencyField("cartTotal", "Cart Total", { default: 38, max: 100000, step: 0.01 }),
      currencyField("threshold", "Free Shipping Minimum", { default: 50, max: 100000, step: 1 }),
      currencyField("shippingFee", "Shipping Fee If You Don't Reach It", { default: 7.99, max: 1000, step: 0.01 }),
      currencyField("fillerPrice", "Price of a Filler Item You'd Add", { default: 6.5, max: 10000, step: 0.01, required: false }),
    ],
    calcResult: { label: "Amount to Add", format: "currency" },
    calcResults: [
      { key: "amountToAdd", label: "Amount to Add for Free Shipping", format: "currency", highlight: true },
      { key: "shippingSaved", label: "Shipping You'd Save", format: "currency" },
      { key: "fillerItemsNeeded", label: "Filler Items Needed", format: "number" },
      { key: "extraSpendVsShipping", label: "Extra Spend vs Paying Shipping", format: "currency" },
      { key: "totalIfYouPayShipping", label: "Total If You Pay Shipping", format: "currency" },
      { key: "totalIfYouAddItems", label: "Total If You Add Items", format: "currency" },
    ],
    instructions:
      "Enter your cart total, the store's free shipping minimum and the shipping fee you'd pay otherwise.\n\n" +
      "Add the price of something you'd actually use to see whether adding it beats paying for shipping.",
    examples: "Example: a $38 cart with free shipping at $50 and a $7.99 fee. You need $12.00 more — two $6.50 items, which cost $5.01 more than paying shipping. Only worth it if you'd buy them anyway.",
    assumptions: "A filler item is only a good deal if you'd buy it anyway; otherwise any extra spend above the shipping fee is money lost. Some stores count the subtotal after discounts and before tax toward the minimum.",
    faq: [
      { question: "Is it worth adding items to get free shipping?", answer: "Only if the extra items are things you need, or if they cost less than the shipping fee you'd save." },
      { question: "Does tax count toward the free shipping minimum?", answer: "Usually not — most stores use the subtotal after discounts and before tax." },
    ],
  },
  {
    slug: "volume-discount-calculator",
    title: "Volume Discount Calculator",
    description: "Calculate tiered volume pricing — a bigger discount as the quantity grows — your price per unit and total, and how much you'd pay at the next tier.",
    metaTitle: "Volume Discount Calculator — Tiered Pricing",
    metaDescription: "Free volume discount calculator. Apply tiered quantity discounts, see the unit price and total, and check whether moving up a tier saves money.",
    calcInputs: [
      currencyField("unitPrice", "Regular Price per Unit", { default: 12, max: 1000000, step: 0.01 }),
      numberField("quantity", "Quantity", { default: 90, max: 10000000 }),
      numberField("tier1Qty", "Tier 1 Starts At (Units)", { default: 50, max: 10000000 }),
      percentField("tier1Discount", "Tier 1 Discount", { default: 5, max: 100, step: 0.5 }),
      numberField("tier2Qty", "Tier 2 Starts At (Units)", { default: 100, max: 10000000, required: false }),
      percentField("tier2Discount", "Tier 2 Discount", { default: 10, max: 100, step: 0.5, required: false }),
      numberField("tier3Qty", "Tier 3 Starts At (Units)", { default: 250, max: 10000000, required: false }),
      percentField("tier3Discount", "Tier 3 Discount", { default: 15, max: 100, step: 0.5, required: false }),
    ],
    calcResult: { label: "Total Price", format: "currency" },
    calcResults: [
      { key: "totalPrice", label: "Total Price", format: "currency", highlight: true },
      { key: "pricePerUnit", label: "Price per Unit", format: "currency" },
      { key: "savings", label: "Savings", format: "currency" },
      { key: "discountApplied", label: "Discount Applied", format: "percentage" },
      { key: "unitsToNextTier", label: "Units to the Next Tier", format: "number" },
      { key: "nextTierTotal", label: "Total at the Next Tier", format: "currency" },
    ],
    instructions:
      "Enter the regular unit price and your quantity, then up to three price tiers — the quantity each starts at and its discount.\n\n" +
      "The result shows your price now and what you'd pay if you ordered enough to reach the next tier.",
    examples: "Example: 90 units at $12 with 5% off from 50 units and 10% off from 100. You pay $11.40 a unit, $1,026.00 in total. Ordering 10 more units would cost $1,080.00 — only a little more for 10 extra units.",
    assumptions: "All-units pricing: once you reach a tier, every unit gets that tier's discount. Some suppliers use incremental pricing, where only the units above each break get the lower price.",
    faq: [
      { question: "What is a volume discount?", answer: "A lower price per unit for buying more — for example 5% off from 50 units and 10% off from 100." },
      { question: "Can buying more cost less in total?", answer: "Yes. Near a tier break, the bigger discount can make a larger order cheaper than a slightly smaller one." },
    ],
  },
  {
    slug: "bundle-price-calculator",
    title: "Bundle Price Calculator",
    description: "Compare a bundle price with buying the items separately — the savings, the percentage saved and whether it's still a deal if you only want some of the items.",
    metaTitle: "Bundle Price Calculator — Is the Bundle a Deal?",
    metaDescription: "Free bundle price calculator. Compare a bundle with buying items separately, see the savings and check whether it's worth it for just the items you want.",
    calcInputs: [
      currencyField("item1", "Item 1 Price", { default: 59.99, max: 1000000, step: 0.01 }),
      currencyField("item2", "Item 2 Price", { default: 39.99, max: 1000000, step: 0.01 }),
      currencyField("item3", "Item 3 Price", { default: 19.99, max: 1000000, step: 0.01, required: false }),
      currencyField("item4", "Item 4 Price", { default: 0, max: 1000000, step: 0.01, required: false }),
      currencyField("bundlePrice", "Bundle Price", { default: 89.99, max: 1000000, step: 0.01 }),
      numberField("itemsYouWant", "How Many of These Items You Actually Want (From the Top)", { default: 2, min: 1, max: 4 }),
    ],
    calcResult: { label: "Bundle Savings", format: "currency" },
    calcResults: [
      { key: "bundleSavings", label: "Bundle Savings", format: "currency", highlight: true },
      { key: "percentSaved", label: "Percent Saved", format: "percentage" },
      { key: "separateTotal", label: "Total If Bought Separately", format: "currency" },
      { key: "savingsOnItemsYouWant", label: "Savings vs Only What You Want", format: "currency" },
      { key: "effectivePricePerItem", label: "Price per Item in the Bundle", format: "currency" },
    ],
    instructions:
      "Enter the separate price of each item in the bundle (leave unused items at 0) and the bundle price.\n\n" +
      "List the items you really want first and enter how many of them you'd buy anyway — a negative saving means the bundle costs more than buying just those.",
    examples: "Example: a $89.99 bundle of items priced $59.99, $39.99 and $19.99 saves $29.98 (24.99%). But if you'd only buy the first two, the bundle saves just $9.99.",
    assumptions: "Separate prices should be what you'd actually pay elsewhere, including sales. Bundles are only a deal if you'd use the extra items.",
    faq: [
      { question: "Are bundles always cheaper?", answer: "Compared with buying everything separately, usually. But if you only need some of the items, buying those alone can cost less." },
      { question: "How do you calculate bundle savings?", answer: "Add up the separate prices and subtract the bundle price. Divide the saving by the separate total for the percentage." },
    ],
  },
  {
    slug: "rebate-calculator",
    title: "Rebate Calculator",
    description: "Find what you really pay after instant and mail-in rebates — including sales tax on the pre-rebate price — and the expected price if you might not mail the rebate in.",
    metaTitle: "Rebate Calculator — Price After Mail-In Rebates",
    metaDescription: "Free rebate calculator. Work out the effective price after instant and mail-in rebates, tax on the full price and the price you can expect to pay.",
    calcInputs: [
      currencyField("price", "Price Before Rebates", { default: 899.99, max: 10000000, step: 0.01 }),
      currencyField("instantRebate", "Instant Rebate", { default: 100, max: 1000000, step: 1, required: false }),
      currencyField("mailInRebate", "Mail-In Rebate", { default: 150, max: 1000000, step: 1, required: false }),
      percentField("taxRate", "Sales Tax", { default: 7, max: 20, step: 0.01, required: false }),
      dropdown("taxBeforeRebate", "Tax Charged On", [["The price before instant rebates", 1], ["The price after instant rebates", 0]], 1),
      percentField("redeemChance", "Chance You'll Actually Claim the Mail-In", { default: 70, max: 100, step: 5 }),
    ],
    calcResult: { label: "Effective Price", format: "currency" },
    calcResults: [
      { key: "effectivePrice", label: "Effective Price After Rebates", format: "currency", highlight: true },
      { key: "paidAtRegister", label: "Paid at the Register", format: "currency" },
      { key: "salesTax", label: "Sales Tax", format: "currency" },
      { key: "totalRebates", label: "Total Rebates", format: "currency" },
      { key: "expectedPrice", label: "Expected Price (Allowing for Unclaimed Rebates)", format: "currency" },
      { key: "effectiveDiscount", label: "Effective Discount", format: "percentage" },
    ],
    instructions:
      "Enter the price before rebates, any instant rebate taken at the register and the mail-in rebate you'll claim afterwards. Add your sales tax rate and choose how it's charged.\n\n" +
      "Be honest about the chance you'll mail it in — many rebates go unclaimed.",
    examples: "Example: an $899.99 TV with a $100 instant and $150 mail-in rebate and 7% tax on the full price. You pay $862.99 at the register and $712.99 after the rebate. At a 70% chance of claiming, expect to pay $757.99.",
    assumptions: "Most states charge sales tax on the price before manufacturer rebates, and some on the price before instant store rebates too. Mail-in rebates often arrive as prepaid cards weeks later and are frequently never claimed.",
    faq: [
      { question: "Do you pay sales tax on the price before a rebate?", answer: "Usually yes for manufacturer and mail-in rebates; store discounts at the register normally lower the taxable price." },
      { question: "How many mail-in rebates go unclaimed?", answer: "A large share — estimates commonly range from 40% to 60% — which is why companies offer them." },
    ],
  },
  {
    slug: "price-adjustment-calculator",
    title: "Price Adjustment Calculator",
    description: "See how much money you can get back when something you bought goes on sale within the store's price adjustment window, including the sales tax.",
    metaTitle: "Price Adjustment Calculator — Refund After a Sale",
    metaDescription: "Free price adjustment calculator. Find the refund when an item you bought drops in price within the store's window, with tax and days left.",
    calcInputs: [
      currencyField("pricePaid", "Price You Paid (Each)", { default: 349.99, max: 1000000, step: 0.01 }),
      currencyField("newPrice", "New Lower Price (Each)", { default: 279.99, max: 1000000, step: 0.01 }),
      numberField("quantity", "Quantity", { default: 1, min: 1, max: 1000 }),
      numberField("daysSincePurchase", "Days Since You Bought It", { unit: "days", default: 9, max: 365 }),
      numberField("windowDays", "Store's Price Adjustment Window", { unit: "days", default: 14, max: 365 }),
      percentField("taxRate", "Sales Tax", { default: 6, max: 20, step: 0.01, required: false }),
    ],
    calcResult: { label: "Refund", format: "currency" },
    calcResults: [
      { key: "refund", label: "Refund You Can Claim", format: "currency", highlight: true },
      { key: "eligible", label: "Within the Window? (1 = Yes)", format: "number" },
      { key: "priceDrop", label: "Price Drop", format: "currency" },
      { key: "daysLeft", label: "Days Left to Claim", format: "number" },
      { key: "percentDrop", label: "Price Drop %", format: "percentage" },
    ],
    instructions:
      "Enter what you paid, the new lower price and the quantity, then how many days ago you bought it and the store's price adjustment window (often 14 to 30 days).\n\n" +
      "Bring your receipt and ask at customer service or through the store's app.",
    examples: "Example: a $349.99 item that drops to $279.99 nine days after purchase, with a 14-day window and 6% tax. You can claim $74.20 and have 5 days left.",
    assumptions: "Policies vary: many stores exclude clearance, doorbusters, competitors' prices or holiday periods. The refund includes the sales tax you paid on the difference. Some credit cards used to offer price protection; few still do.",
    faq: [
      { question: "What is a price adjustment?", answer: "A refund of the difference when an item you bought goes on sale at the same store within a set number of days." },
      { question: "Do you get the tax back on a price adjustment?", answer: "Yes, the refund normally includes the sales tax charged on the difference." },
    ],
  },
  {
    slug: "price-increase-calculator",
    title: "Price Increase Calculator",
    description: "Calculate a new price after a percentage increase, or the percentage increase between an old and new price — and what the rise costs you over a year.",
    metaTitle: "Price Increase Calculator — New Price & % Rise",
    metaDescription: "Free price increase calculator. Find the new price after a % increase or the % increase between two prices, and the extra cost per year.",
    calcInputs: [
      currencyField("originalPrice", "Old Price", { default: 15.99, max: 10000000, step: 0.01 }),
      dropdown("mode", "I Know", [["The % increase — find the new price", 0], ["The new price — find the % increase", 1]], 1),
      percentField("increasePercent", "Increase", { default: 10, min: -100, max: 1000, step: 0.1, required: false }),
      currencyField("newPrice", "New Price", { default: 17.99, max: 10000000, step: 0.01, required: false }),
      numberField("unitsPerYear", "How Many You Buy per Year", { default: 12, max: 100000, required: false }),
    ],
    calcResult: { label: "Percent Increase", format: "percentage" },
    calcResults: [
      { key: "percentIncrease", label: "Percent Increase", format: "percentage", highlight: true },
      { key: "newPrice", label: "New Price", format: "currency" },
      { key: "increaseAmount", label: "Increase per Item", format: "currency" },
      { key: "extraCostPerYear", label: "Extra Cost per Year", format: "currency" },
      { key: "discountToGoBack", label: "Discount Needed to Get Back to the Old Price", format: "percentage" },
    ],
    instructions:
      "Enter the old price and choose what you know: the percentage increase, or the new price.\n\n" +
      "Add how often you buy it to see the extra cost over a year — handy for subscriptions and price hikes.",
    examples: "Example: a streaming plan goes from $15.99 to $17.99 — a 12.51% increase, $2.00 a month or $24.00 a year. It would take a 11.12% discount to get back to the old price.",
    assumptions: "Percent increase = (new − old) ÷ old × 100. A price that rises 10% and then falls 10% ends up 1% lower, because each change is a percentage of a different base.",
    faq: [
      { question: "How do I calculate a price increase percentage?", answer: "Subtract the old price from the new one, divide by the old price and multiply by 100." },
      { question: "Why isn't a 10% increase undone by a 10% discount?", answer: "The discount is a percentage of the higher price: $100 up 10% is $110, and 10% off $110 is $11, which brings it to $99 — below the original $100." },
    ],
  },
  {
    slug: "original-price-calculator",
    title: "Original Price Calculator",
    description: "Find the original price before a discount from the sale price and the percentage off — with or without sales tax included — and how much you saved.",
    metaTitle: "Original Price Calculator — Price Before Discount",
    metaDescription: "Free original price calculator. Work out the price before a discount from the sale price and % off, and remove sales tax if it's included.",
    calcInputs: [
      currencyField("salePrice", "Sale Price You Paid", { default: 63.75, max: 10000000, step: 0.01 }),
      percentField("discountPercent", "Discount", { default: 25, max: 99, step: 0.5 }),
      dropdown("taxIncluded", "Does the Sale Price Include Tax?", [["No", 0], ["Yes", 1]], 0),
      percentField("taxRate", "Sales Tax Rate (If Included)", { default: 0, max: 20, step: 0.01, required: false }),
    ],
    calcResult: { label: "Original Price", format: "currency" },
    calcResults: [
      { key: "originalPrice", label: "Original Price", format: "currency", highlight: true },
      { key: "amountSaved", label: "Amount Saved", format: "currency" },
      { key: "salePriceBeforeTax", label: "Sale Price Before Tax", format: "currency" },
      { key: "discountPercent", label: "Discount", format: "percentage" },
    ],
    instructions:
      "Enter the sale price and the percentage discount. If the price you have includes sales tax, say so and enter the tax rate so it's removed first.",
    examples: "Example: you paid $63.75 at 25% off. The original price was $85.00, so you saved $21.25.",
    assumptions: "Original price = sale price ÷ (1 − discount). Dividing, not adding the percentage back, is what gives the right answer: adding 25% to $63.75 gives $79.69, not $85.",
    faq: [
      { question: "How do you find the original price after a discount?", answer: "Divide the sale price by (1 − the discount as a decimal). For 25% off, divide by 0.75." },
      { question: "Why can't I just add the percentage back?", answer: "The discount was a percentage of the original, larger price, so adding the same percentage of the smaller sale price comes up short." },
    ],
  },
  {
    slug: "lego-price-per-piece-calculator",
    title: "LEGO Price per Piece Calculator",
    description: "Work out a LEGO set's price per piece and pieces per dollar, after any discount, and compare it with the 10¢-a-piece benchmark collectors use.",
    metaTitle: "LEGO Price per Piece Calculator — Set Value",
    metaDescription: "Free LEGO price per piece calculator. Find cents per piece and pieces per dollar for any set, with discounts and minifigures, vs the 10¢ benchmark.",
    calcInputs: [
      currencyField("setPrice", "Set Price", { default: 119.99, max: 100000, step: 0.01 }),
      numberField("pieces", "Number of Pieces", { default: 1440, max: 100000 }),
      percentField("discountPercent", "Discount", { default: 20, max: 90, step: 1, required: false }),
      numberField("minifigs", "Minifigures in the Set", { default: 4, max: 100, required: false }),
      currencyField("minifigValue", "Value You Put on Each Minifigure", { default: 4, max: 1000, step: 0.5, required: false }),
    ],
    calcResult: { label: "Cents per Piece", format: "number" },
    calcResults: [
      { key: "centsPerPiece", label: "Cents per Piece", format: "number", highlight: true },
      { key: "piecesPerDollar", label: "Pieces per Dollar", format: "number" },
      { key: "priceAfterDiscount", label: "Price After Discount", format: "currency" },
      { key: "centsPerPieceExMinifigs", label: "Cents per Piece Without Minifigure Value", format: "number" },
      { key: "valueVs10Cents", label: "Value vs 10¢ Benchmark (100 = Average)", format: "number" },
    ],
    instructions:
      "Enter the set's price and piece count from the box or LEGO.com, and any discount you're getting.\n\n" +
      "Optionally add the minifigures and what each is worth to you — they're often the most valuable part of a set.",
    examples: "Example: a $119.99 set with 1,440 pieces at 20% off works out to 6.67¢ per piece (15 pieces per dollar), scoring 150.01 against the 10¢ benchmark.",
    assumptions: "About 10¢ a piece is the long-running benchmark for a fair LEGO price; licensed sets (Star Wars, Marvel) often run 11–13¢, while large sets with many small parts can fall below 8¢. Price per piece ignores part size, so it favours sets full of tiny pieces.",
    faq: [
      { question: "What is a good LEGO price per piece?", answer: "Around 10 cents or less. Licensed sets usually cost more per piece; sets with big or special parts can be worth more than the number suggests." },
      { question: "Why do licensed LEGO sets cost more per piece?", answer: "LEGO pays licensing fees for brands like Star Wars and Disney, so those sets typically cost a couple of cents more per piece." },
    ],
  },
  {
    slug: "pizza-size-value-calculator",
    title: "Pizza Size Value Calculator",
    description: "Compare pizza deals by price per square inch — one large vs two mediums, or any three options — and see which gives you the most pizza for your money.",
    metaTitle: "Pizza Size Value Calculator — Best Pizza Deal",
    metaDescription: "Free pizza size value calculator. Compare price per square inch for up to three pizza deals and find out if one large beats two mediums.",
    calcInputs: [
      numberField("size1", "Pizza 1 Diameter", { unit: "in", default: 18, max: 40 }),
      numberField("count1", "Pizza 1 Quantity", { default: 1, min: 1, max: 20 }),
      currencyField("price1", "Pizza 1 Total Price", { default: 22, max: 1000, step: 0.01 }),
      numberField("size2", "Pizza 2 Diameter", { unit: "in", default: 12, max: 40 }),
      numberField("count2", "Pizza 2 Quantity", { default: 2, min: 1, max: 20 }),
      currencyField("price2", "Pizza 2 Total Price", { default: 26, max: 1000, step: 0.01 }),
      numberField("size3", "Pizza 3 Diameter", { unit: "in", default: 14, max: 40, required: false }),
      numberField("count3", "Pizza 3 Quantity", { default: 1, min: 1, max: 20, required: false }),
      currencyField("price3", "Pizza 3 Total Price", { default: 0, max: 1000, step: 0.01, required: false }),
    ],
    calcResult: { label: "Best Deal (Option #)", format: "number" },
    calcResults: [
      { key: "bestDeal", label: "Best Deal (Option #)", format: "number", highlight: true },
      { key: "centsPerSqIn1", label: "Option 1 — Cents per Sq In", format: "number" },
      { key: "area1", label: "Option 1 — Total Area (sq in)", format: "number" },
      { key: "centsPerSqIn2", label: "Option 2 — Cents per Sq In", format: "number" },
      { key: "area2", label: "Option 2 — Total Area (sq in)", format: "number" },
      { key: "centsPerSqIn3", label: "Option 3 — Cents per Sq In", format: "number" },
      { key: "area3", label: "Option 3 — Total Area (sq in)", format: "number" },
    ],
    instructions:
      "For each option, enter the pizza diameter in inches, how many you'd get and the total price for that many. Leave option 3's price at 0 to compare just two.\n\n" +
      "The lowest cents per square inch is the best value.",
    examples: "Example: one 18-inch pizza for $22 vs two 12-inch pizzas for $26. The 18-inch has 254.47 sq in at 8.65¢ each; the two 12-inch pizzas have only 226.19 sq in at 11.49¢. Option 1 wins.",
    assumptions: "Area = π × (diameter ÷ 2)² for round pizzas. Because area grows with the square of the diameter, one 18-inch pizza has more pizza than two 12-inch ones. Crust takes up a bigger share of small pizzas, so the gap is even wider for toppings.",
    faq: [
      { question: "Is one large pizza better than two mediums?", answer: "Usually. An 18-inch pizza has about 254 sq in — more than two 12-inch pizzas (226 sq in) — and often costs less." },
      { question: "How do you compare pizza prices?", answer: "Divide the price by the area in square inches. The lower the price per square inch, the better the deal." },
    ],
  },
  {
    slug: "annual-cost-calculator",
    title: "Annual Cost Calculator",
    description: "Turn any recurring cost — daily coffee, a weekly takeout habit, a monthly subscription — into its yearly, monthly and daily cost, the total over several years, and what it could grow to if invested.",
    metaTitle: "Annual Cost Calculator — Yearly Cost of a Habit",
    metaDescription: "Free annual cost calculator. Convert a daily, weekly or monthly cost into a yearly total, a multi-year total and its value if invested instead.",
    calcInputs: [
      currencyField("amount", "Cost Each Time", { default: 6.5, max: 1000000, step: 0.01 }),
      dropdown("frequency", "How Often", [["Every day", 0], ["Every week", 1], ["Every two weeks", 2], ["Every month", 3], ["Every quarter", 4], ["Every year", 5]], 0),
      numberField("years", "Over How Many Years", { unit: "years", default: 10, max: 60 }),
      percentField("returnRate", "Investment Return If Invested Instead", { default: 7, max: 20, step: 0.5, required: false }),
    ],
    calcResult: { label: "Annual Cost", format: "currency" },
    calcResults: [
      { key: "annualCost", label: "Annual Cost", format: "currency", highlight: true },
      { key: "monthlyCost", label: "Monthly Cost", format: "currency" },
      { key: "dailyCost", label: "Daily Cost", format: "currency" },
      { key: "totalOverYears", label: "Total Over the Years", format: "currency" },
      { key: "ifInvested", label: "Value If Invested Instead", format: "currency" },
    ],
    instructions:
      "Enter what you spend each time and how often you spend it, then the number of years.\n\n" +
      "Add an investment return to see what the money could grow to if you invested it at the end of each year instead.",
    examples: "Example: a $6.50 coffee every day costs $2,372.50 a year — $23,725.00 over 10 years. Invested at 7% a year, the same money would grow to $32,779.52.",
    assumptions: "Daily = 365 days; weekly = 52; every two weeks = 26. The invested value assumes each year's spending is invested at the end of the year at a steady return, before tax and inflation.",
    faq: [
      { question: "How do I calculate an annual cost?", answer: "Multiply the cost by how many times it happens in a year — 365 for daily, 52 for weekly, 12 for monthly." },
      { question: "Why compare a habit with investing?", answer: "Small, frequent costs add up, and money invested instead keeps compounding — the gap after 10 or 20 years is often surprising." },
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
