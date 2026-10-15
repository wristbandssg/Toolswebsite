// One-time (but safe to re-run) batch setup script: creates 11 marketplace and payment fee tools
// from the user's shopping list (Shopping Calculators > Pricing, Markup & Seller Fee Calculators).
// See src/lib/calc-engine-shopping-price-fees.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-price-fees-calculators.ts
// or
//   npm run db:create-shopping-price-fees-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Pricing, Markup & Seller Fee Calculators", slug: "pricing-markup-seller-fee-calculators" };

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

const FEES_CHANGE = "Platforms change their fees; check the seller fee page before relying on the result.";

const TOOLS: ToolDef[] = [
  {
    slug: "etsy-fee-calculator",
    title: "Etsy Fee Calculator",
    description: "Calculate Etsy fees on a sale — the $0.20 listing fee, 6.5% transaction fee, payment processing and offsite ads — plus your payout, profit and margin.",
    metaTitle: "Etsy Fee Calculator — Fees, Payout & Profit",
    metaDescription: "Free Etsy fee calculator. Add up listing, transaction, payment processing and offsite ads fees on a sale and see your payout and profit margin.",
    calcInputs: [
      currencyField("itemPrice", "Item Price", { default: 35, max: 100000, step: 0.01 }),
      currencyField("shippingCharged", "Shipping Charged to Buyer", { default: 6, max: 10000, step: 0.01, required: false }),
      currencyField("itemCost", "Your Cost to Make the Item", { default: 9, max: 100000, step: 0.01, required: false }),
      currencyField("shippingCost", "Your Actual Shipping Cost", { default: 5.5, max: 10000, step: 0.01, required: false }),
      percentField("salesTaxRate", "Sales Tax Collected", { default: 7, max: 20, step: 0.01, required: false }),
      percentField("transactionRate", "Transaction Fee", { default: 6.5, max: 20, step: 0.1 }),
      percentField("processingRate", "Payment Processing Rate", { default: 3, max: 10, step: 0.1 }),
      currencyField("processingFixed", "Payment Processing Fixed Fee", { default: 0.25, max: 5, step: 0.01 }),
      dropdown("offsiteAds", "Sale From an Offsite Ad?", [["No", 0], ["Yes", 1]], 0),
      percentField("offsiteRate", "Offsite Ads Fee", { default: 15, max: 20, step: 1, required: false }),
    ],
    calcResult: { label: "Total Etsy Fees", format: "currency" },
    calcResults: [
      { key: "totalFees", label: "Total Etsy Fees", format: "currency", highlight: true },
      { key: "transactionFee", label: "Transaction Fee", format: "currency" },
      { key: "processingFee", label: "Payment Processing Fee", format: "currency" },
      { key: "payout", label: "Payout After Fees", format: "currency" },
      { key: "profit", label: "Profit After Costs", format: "currency" },
      { key: "profitMargin", label: "Profit Margin", format: "percentage" },
      { key: "feePercent", label: "Fees as % of Sale", format: "percentage" },
    ],
    instructions:
      "Enter the item price and the shipping you charge, then what the item costs you to make and to ship. Etsy charges its processing fee on the total including sales tax, so add the tax rate.\n\n" +
      "Choose Yes for offsite ads if the order came from an Etsy ad on another site (15%, or 12% for shops with over $10,000 in yearly sales).",
    examples: "Example: a $35 item with $6 shipping. Etsy's 6.5% transaction fee is $2.67 and processing is $1.57; with the $0.20 listing fee the total is $4.43. After $9 to make and $5.50 to ship, profit is $22.07 — a 53.83% margin.",
    assumptions: "US fees: $0.20 listing (renewed with each sale), 6.5% transaction fee on item + shipping + gift wrap, payment processing 3% + $0.25 on the total including tax, offsite ads 15% capped at $100 per order. Some countries add a regulatory operating fee. " + FEES_CHANGE,
    faq: [
      { question: "How much does Etsy take per sale?", answer: "Usually around 10% to 12% of the order: a $0.20 listing fee, 6.5% transaction fee and about 3% + $0.25 processing — more if the sale came from offsite ads." },
      { question: "Does Etsy charge fees on shipping?", answer: "Yes. The 6.5% transaction fee and the processing fee both apply to the shipping you charge." },
    ],
  },
  {
    slug: "stripe-fee-calculator",
    title: "Stripe Fee Calculator",
    description: "Calculate Stripe's fee on a payment — 2.9% + 30¢ with extra for international cards and currency conversion — what you receive, and how much to charge to receive a set amount.",
    metaTitle: "Stripe Fee Calculator — Fees & Amount to Charge",
    metaDescription: "Free Stripe fee calculator. Find the Stripe fee on a payment, what you receive, and how much to charge to get a set amount after fees.",
    calcInputs: [
      currencyField("amount", "Payment Amount", { default: 250, max: 10000000, step: 0.01 }),
      percentField("rate", "Card Rate", { default: 2.9, max: 10, step: 0.1 }),
      currencyField("fixedFee", "Fixed Fee per Payment", { default: 0.3, max: 5, step: 0.01 }),
      dropdown("international", "International Card?", [["No", 0], ["Yes (+1.5%)", 1]], 0),
      dropdown("currencyConversion", "Currency Conversion?", [["No", 0], ["Yes (+1%)", 1]], 0),
    ],
    calcResult: { label: "Stripe Fee", format: "currency" },
    calcResults: [
      { key: "fee", label: "Stripe Fee", format: "currency", highlight: true },
      { key: "youReceive", label: "You Receive", format: "currency" },
      { key: "effectiveRate", label: "Effective Fee Rate", format: "percentage" },
      { key: "chargeToReceiveAmount", label: "Charge This to Receive the Full Amount", format: "currency" },
    ],
    instructions:
      "Enter the payment amount and Stripe's rate for your account (2.9% + 30¢ for standard US online card payments). Choose whether the card is international or needs currency conversion.\n\n" +
      "The last line shows what to charge if you want to receive the full amount after fees.",
    examples: "Example: a $250 payment at 2.9% + 30¢ costs $7.55 in fees, so you receive $242.45. To receive the full $250, charge $257.78.",
    assumptions: "Standard US pricing: 2.9% + 30¢ for online card payments, +1.5% for international cards and +1% when currency conversion is needed. ACH, in-person and custom pricing differ. Charging customers extra to cover fees may count as a surcharge with its own rules. " + FEES_CHANGE,
    faq: [
      { question: "How much does Stripe charge?", answer: "2.9% + 30¢ per successful online card payment in the US, with extra for international cards and currency conversion." },
      { question: "How do I pass Stripe fees to the customer?", answer: "Charge (amount + 0.30) ÷ (1 − 0.029). Check card network and state rules on surcharging first." },
    ],
  },
  {
    slug: "square-fee-calculator",
    title: "Square Fee Calculator",
    description: "Calculate Square fees for in-person, online, keyed-in and invoice payments, what you receive, the amount to charge to cover fees, and your monthly fees.",
    metaTitle: "Square Fee Calculator — In-Person & Online Fees",
    metaDescription: "Free Square fee calculator. Find Square processing fees for in-person, online, keyed-in and invoice payments, what you receive and monthly fees.",
    calcInputs: [
      currencyField("amount", "Payment Amount", { default: 80, max: 10000000, step: 0.01 }),
      dropdown("paymentType", "Payment Type", [["In person (tap, dip, swipe) — 2.6% + 15¢", 0], ["Online / e-commerce — 2.9% + 30¢", 1], ["Keyed in or card on file — 3.5% + 15¢", 2], ["Invoice paid by card — 3.3% + 30¢", 3]], 0),
      currencyField("monthlyVolume", "Monthly Card Sales", { default: 12000, max: 100000000, step: 100, required: false }),
      numberField("monthlyTransactions", "Monthly Transactions", { default: 300, max: 10000000, required: false }),
    ],
    calcResult: { label: "Square Fee", format: "currency" },
    calcResults: [
      { key: "fee", label: "Square Fee", format: "currency", highlight: true },
      { key: "youReceive", label: "You Receive", format: "currency" },
      { key: "effectiveRate", label: "Effective Fee Rate", format: "percentage" },
      { key: "chargeToReceiveAmount", label: "Charge This to Receive the Full Amount", format: "currency" },
      { key: "monthlyFees", label: "Monthly Fees", format: "currency" },
    ],
    instructions:
      "Enter the payment amount and how the card is taken. Add your monthly card sales and number of transactions to see your monthly fees.",
    examples: "Example: an $80 in-person payment costs $2.23, so you receive $77.77. On $12,000 a month in 300 in-person sales, fees are about $357.00.",
    assumptions: "Square Free plan rates in the US: 2.6% + 15¢ in person, 2.9% + 30¢ online, 3.5% + 15¢ keyed in or card on file, 3.3% + 30¢ for invoices. Paid plans and custom pricing for high volume can be lower. " + FEES_CHANGE,
    faq: [
      { question: "What does Square charge per transaction?", answer: "2.6% + 15¢ for in-person card payments on the free plan, and more for online, keyed-in and invoice payments." },
      { question: "Does Square have monthly fees?", answer: "The free plan has none; you pay only processing fees. Paid plans add features for a monthly fee." },
    ],
  },
  {
    slug: "depop-fee-calculator",
    title: "Depop Fee Calculator",
    description: "Calculate Depop fees on a sale — payment processing on the item plus shipping, optional boosting fee — and what you take home after your costs.",
    metaTitle: "Depop Fee Calculator — Fees, Payout & Profit",
    metaDescription: "Free Depop fee calculator. Work out Depop processing and boosting fees on a sale, your payout after shipping and your profit margin.",
    calcInputs: [
      currencyField("itemPrice", "Item Price", { default: 40, max: 100000, step: 0.01 }),
      currencyField("shippingCharged", "Shipping Charged to Buyer", { default: 7, max: 1000, step: 0.01, required: false }),
      currencyField("itemCost", "What You Paid for the Item", { default: 8, max: 100000, step: 0.01, required: false }),
      currencyField("shippingCost", "Your Shipping Cost", { default: 7, max: 1000, step: 0.01, required: false }),
      percentField("processingRate", "Payment Processing Rate", { default: 3.3, max: 10, step: 0.1 }),
      currencyField("processingFixed", "Payment Processing Fixed Fee", { default: 0.45, max: 5, step: 0.01 }),
      percentField("sellingFeeRate", "Selling Fee (0 for US Sellers)", { default: 0, max: 20, step: 0.5, required: false }),
      dropdown("boosted", "Sold Through a Boosted Listing?", [["No", 0], ["Yes (8%)", 1]], 0),
    ],
    calcResult: { label: "Total Depop Fees", format: "currency" },
    calcResults: [
      { key: "totalFees", label: "Total Depop Fees", format: "currency", highlight: true },
      { key: "processingFee", label: "Payment Processing Fee", format: "currency" },
      { key: "payout", label: "Payout After Fees", format: "currency" },
      { key: "profit", label: "Profit After Costs", format: "currency" },
      { key: "profitMargin", label: "Profit Margin", format: "percentage" },
      { key: "feePercent", label: "Fees as % of Sale", format: "percentage" },
    ],
    instructions:
      "Enter the sale price and the shipping the buyer paid, then what you paid for the item and the actual shipping cost.\n\n" +
      "US sellers pay no Depop selling fee, only payment processing; add a selling fee if you sell from a country that still has one. Choose Yes if the item sold through a boosted listing.",
    examples: "Example: a $40 item with $7 shipping. Processing at 3.3% + $0.45 is $2.00, so fees total $2.00. After an $8 item cost and $7 shipping, your profit is $30.00.",
    assumptions: "US: no selling fee since 2024; payment processing 3.3% + $0.45 on the total (item + shipping); boosted listings 8%. Fees differ in the UK and other markets. " + FEES_CHANGE,
    faq: [
      { question: "Does Depop take a fee?", answer: "In the US there's no selling fee, but you pay payment processing of about 3.3% + $0.45 per sale, plus 8% on boosted sales." },
      { question: "Does Depop charge fees on shipping?", answer: "Yes — the processing fee applies to the full amount the buyer pays, including shipping." },
    ],
  },
  {
    slug: "shopify-fee-calculator",
    title: "Shopify Fee Calculator",
    description: "Estimate your monthly Shopify costs — plan price, Shopify Payments card fees or third-party gateway fees, and apps — the fee per order and your effective fee rate.",
    metaTitle: "Shopify Fee Calculator — Monthly Plan & Card Fees",
    metaDescription: "Free Shopify fee calculator. Add up your Shopify plan, card processing or third-party gateway fees and apps to find monthly fees and cost per order.",
    calcInputs: [
      dropdown("plan", "Shopify Plan", [["Basic — $39/mo, 2.9% + 30¢", 0], ["Shopify (Grow) — $105/mo, 2.7% + 30¢", 1], ["Advanced — $399/mo, 2.5% + 30¢", 2]], 0),
      currencyField("monthlySales", "Monthly Online Sales", { default: 8000, max: 100000000, step: 100 }),
      numberField("monthlyOrders", "Monthly Orders", { default: 160, max: 10000000 }),
      dropdown("gateway", "Payment Provider", [["Shopify Payments", 0], ["Third-party gateway (PayPal, Stripe…)", 1]], 0),
      percentField("gatewayRate", "Third-Party Gateway Rate", { default: 3.49, max: 10, step: 0.01, required: false }),
      currencyField("gatewayFixed", "Third-Party Gateway Fixed Fee", { default: 0.49, max: 5, step: 0.01, required: false }),
      currencyField("appsAndThemes", "Apps & Theme per Month", { default: 60, max: 100000, step: 1, required: false }),
    ],
    calcResult: { label: "Monthly Shopify Fees", format: "currency" },
    calcResults: [
      { key: "monthlyFees", label: "Total Monthly Fees", format: "currency", highlight: true },
      { key: "planCost", label: "Plan Cost", format: "currency" },
      { key: "paymentFees", label: "Payment Processing Fees", format: "currency" },
      { key: "feePerOrder", label: "Fees per Order", format: "currency" },
      { key: "effectiveRate", label: "Effective Fee Rate", format: "percentage" },
    ],
    instructions:
      "Choose your plan and enter monthly sales and orders. If you use a payment provider other than Shopify Payments, choose it and enter that provider's rate — Shopify adds its own transaction fee on top.\n\n" +
      "Add what you spend on apps and your theme each month.",
    examples: "Example: $8,000 a month in 160 orders on Basic with Shopify Payments and $60 of apps. Card fees are $280.00 and the total is $379.00 a month — $2.37 an order, 4.74% of sales.",
    assumptions: "US monthly-billing plan prices and online card rates. Paying yearly cuts plan prices by about 25%. Using a third-party gateway adds a Shopify transaction fee of 2% (Basic), 1% (Shopify) or 0.6% (Advanced). In-person and international card rates differ. " + FEES_CHANGE,
    faq: [
      { question: "How much does Shopify cost per month?", answer: "From $39 a month on Basic (monthly billing), plus card processing of about 2.9% + 30¢ per order with Shopify Payments, plus any apps." },
      { question: "Does Shopify charge transaction fees?", answer: "Not with Shopify Payments. With a third-party payment provider, Shopify adds 0.6% to 2% depending on your plan." },
    ],
  },
  {
    slug: "tiktok-shop-fee-calculator",
    title: "TikTok Shop Fee Calculator",
    description: "Calculate TikTok Shop seller fees — the referral fee and per-order fee on the item plus shipping, and creator affiliate commission — with your payout and profit.",
    metaTitle: "TikTok Shop Fee Calculator — Seller Fees & Profit",
    metaDescription: "Free TikTok Shop fee calculator. Find the referral fee, per-order fee and affiliate commission on a sale, plus your payout and profit margin.",
    calcInputs: [
      currencyField("itemPrice", "Item Price", { default: 29.99, max: 100000, step: 0.01 }),
      currencyField("shippingCharged", "Shipping Charged to Buyer", { default: 0, max: 1000, step: 0.01, required: false }),
      currencyField("itemCost", "Your Product Cost", { default: 8, max: 100000, step: 0.01, required: false }),
      currencyField("shippingCost", "Your Shipping Cost", { default: 5, max: 1000, step: 0.01, required: false }),
      percentField("referralRate", "Referral Fee", { default: 6, max: 20, step: 0.5 }),
      currencyField("perOrderFee", "Per-Order Fee", { default: 0.3, max: 5, step: 0.01, required: false }),
      percentField("affiliateRate", "Creator Affiliate Commission", { default: 15, max: 50, step: 1, required: false }),
    ],
    calcResult: { label: "Total TikTok Shop Fees", format: "currency" },
    calcResults: [
      { key: "totalFees", label: "Total Fees & Commission", format: "currency", highlight: true },
      { key: "referralFee", label: "Referral + Per-Order Fee", format: "currency" },
      { key: "affiliateCommission", label: "Affiliate Commission", format: "currency" },
      { key: "payout", label: "Payout", format: "currency" },
      { key: "profit", label: "Profit After Costs", format: "currency" },
      { key: "profitMargin", label: "Profit Margin", format: "percentage" },
      { key: "feePercent", label: "Fees as % of Sale", format: "percentage" },
    ],
    instructions:
      "Enter the item price, any shipping the buyer pays, your product and shipping costs, and the referral fee for your category. If a creator sells it through the affiliate program, add their commission rate.",
    examples: "Example: a $29.99 item with a 6% referral fee, $0.30 per order and a 15% creator commission. Fees total $6.60; after $8 of product and $5 of shipping, profit is $10.39 (34.65%).",
    assumptions: "US referral fees are charged on the item price plus shipping, after seller discounts. New-seller promotions can lower fees for the first months, and categories differ. Affiliate commission is set by you per product. " + FEES_CHANGE,
    faq: [
      { question: "What are TikTok Shop's seller fees?", answer: "A referral fee as a percentage of each order (item price plus shipping) and a small per-order fee, plus any affiliate commission you offer creators." },
      { question: "Do affiliate commissions count as fees?", answer: "They come out of your payout like fees, so include them when working out profit on creator sales." },
    ],
  },
  {
    slug: "walmart-marketplace-fee-calculator",
    title: "Walmart Marketplace Fee Calculator",
    description: "Calculate Walmart Marketplace referral fees by category, optional Walmart Fulfillment Services (WFS) fees, and your payout and profit per sale.",
    metaTitle: "Walmart Marketplace Fee Calculator — Referral & WFS",
    metaDescription: "Free Walmart Marketplace fee calculator. Find the referral fee for your category, WFS fulfillment fees and your profit per sale.",
    calcInputs: [
      currencyField("itemPrice", "Item Price", { default: 49.99, max: 100000, step: 0.01 }),
      currencyField("shippingCharged", "Shipping Charged to Buyer", { default: 0, max: 1000, step: 0.01, required: false }),
      dropdown("category", "Category (Referral Fee)", [["Most categories — 15%", 15], ["Consumer electronics — 8%", 8], ["Personal computers — 6%", 6], ["Cameras, video games & consoles — 8%", 8], ["Jewelry — 20%", 20], ["Furniture — 15%", 15], ["Automotive & powersports — 12%", 12], ["Baby, beauty & grocery under $10 — 8%", 8]], 15),
      currencyField("itemCost", "Your Product Cost", { default: 18, max: 100000, step: 0.01, required: false }),
      currencyField("shippingCost", "Your Shipping Cost (If Self-Fulfilled)", { default: 6, max: 1000, step: 0.01, required: false }),
      currencyField("wfsFee", "WFS Fulfillment Fee (If Using WFS)", { default: 0, max: 1000, step: 0.01, required: false }),
    ],
    calcResult: { label: "Total Walmart Fees", format: "currency" },
    calcResults: [
      { key: "totalFees", label: "Total Walmart Fees", format: "currency", highlight: true },
      { key: "referralFee", label: "Referral Fee", format: "currency" },
      { key: "payout", label: "Payout", format: "currency" },
      { key: "profit", label: "Profit After Costs", format: "currency" },
      { key: "profitMargin", label: "Profit Margin", format: "percentage" },
      { key: "feePercent", label: "Fees as % of Sale", format: "percentage" },
    ],
    instructions:
      "Enter the item price and shipping charged, pick the category for its referral fee, then your product cost. If you ship orders yourself, enter your shipping cost; if you use Walmart Fulfillment Services, enter the WFS fee instead and set your shipping cost to 0.",
    examples: "Example: a $49.99 item in a 15% category costs $7.50 in referral fees. After $18 of product and $6 of shipping, profit is $18.49 — a 36.99% margin.",
    assumptions: "Walmart charges no monthly or listing fee — only a referral fee on the total sale price (item + shipping), which varies by category and sometimes by price. WFS fees depend on weight and size. " + FEES_CHANGE,
    faq: [
      { question: "How much does Walmart Marketplace charge sellers?", answer: "A referral fee of 6% to 20% depending on category — 15% for most — with no monthly subscription fee." },
      { question: "Is Walmart cheaper to sell on than Amazon?", answer: "Referral fees are similar, but Walmart has no monthly fee; total costs depend on your fulfillment method." },
    ],
  },
  {
    slug: "amazon-fba-fee-calculator",
    title: "Amazon FBA Fee Calculator",
    description: "Estimate Amazon FBA fees — referral fee, fulfillment fee, monthly storage and other charges — and your profit, margin and ROI per unit.",
    metaTitle: "Amazon FBA Fee Calculator — Profit, Margin & ROI",
    metaDescription: "Free Amazon FBA fee calculator. Add the referral fee, FBA fulfillment and storage fees to your costs to find profit, margin and ROI per unit.",
    calcInputs: [
      currencyField("itemPrice", "Selling Price", { default: 29.99, max: 100000, step: 0.01 }),
      currencyField("productCost", "Product Cost per Unit", { default: 7, max: 100000, step: 0.01 }),
      currencyField("shippingToAmazon", "Shipping to Amazon per Unit", { default: 0.8, max: 1000, step: 0.01, required: false }),
      percentField("referralRate", "Referral Fee", { default: 15, max: 45, step: 0.5 }),
      currencyField("fulfillmentFee", "FBA Fulfillment Fee per Unit", { default: 5.77, max: 1000, step: 0.01 }),
      numberField("cubicFeet", "Unit Size", { unit: "cu ft", default: 0.1, max: 100, step: 0.01, required: false }),
      currencyField("storageRate", "Monthly Storage per Cu Ft", { default: 0.78, max: 10, step: 0.01, required: false }),
      numberField("monthsStored", "Months in Storage Before It Sells", { unit: "months", default: 2, max: 24, step: 0.5, required: false }),
      currencyField("inboundFee", "Inbound Placement Fee per Unit", { default: 0.27, max: 100, step: 0.01, required: false }),
      currencyField("closingFee", "Closing Fee (Media Only)", { default: 0, max: 10, step: 0.01, required: false }),
    ],
    calcResult: { label: "Total Amazon Fees", format: "currency" },
    calcResults: [
      { key: "totalFees", label: "Total Amazon Fees", format: "currency", highlight: true },
      { key: "referralFee", label: "Referral Fee", format: "currency" },
      { key: "payout", label: "Payout per Unit", format: "currency" },
      { key: "profit", label: "Profit per Unit", format: "currency" },
      { key: "profitMargin", label: "Profit Margin", format: "percentage" },
      { key: "roi", label: "Return on Investment", format: "percentage" },
      { key: "feePercent", label: "Fees as % of Price", format: "percentage" },
    ],
    instructions:
      "Enter the selling price and your product and inbound shipping costs, then the referral fee for your category (15% for most) and the FBA fulfillment fee for your product's size tier and weight from Seller Central.\n\n" +
      "Add the unit's size in cubic feet, the monthly storage rate and how long stock sits, plus any inbound placement or closing fee.",
    examples: "Example: a $29.99 product costing $7 plus $0.80 to ship in. The referral fee is $4.50 and Amazon's fees total $10.69, leaving $11.50 profit per unit — a 38.33% margin and 147.44% ROI.",
    assumptions: "Referral fees are a percentage of the price with a $0.30 minimum; fulfillment fees depend on size tier and shipping weight (a 1 lb large standard item is about $5–$6). Storage rises in October–December. Returns, advertising and long-term storage aren't included. " + FEES_CHANGE,
    faq: [
      { question: "How much are Amazon FBA fees?", answer: "Typically a 15% referral fee plus a fulfillment fee of about $3–$7 for standard items, plus monthly storage — often 30–40% of the price in total." },
      { question: "What is a good ROI on Amazon FBA?", answer: "Many sellers aim for 30–100% ROI and a 20%+ margin after all fees, leaving room for advertising and returns." },
    ],
  },
  {
    slug: "payment-processing-fee-calculator",
    title: "Payment Processing Fee Calculator",
    description: "Compare monthly credit card processing costs on flat-rate pricing and interchange-plus pricing for your sales volume, and find the cheaper option and effective rate.",
    metaTitle: "Payment Processing Fee Calculator — Compare Rates",
    metaDescription: "Free payment processing fee calculator. Compare flat-rate and interchange-plus card processing costs, effective rates and yearly fees.",
    calcInputs: [
      currencyField("monthlyVolume", "Monthly Card Sales", { default: 40000, max: 100000000, step: 100 }),
      numberField("monthlyTransactions", "Monthly Transactions", { default: 800, max: 10000000 }),
      percentField("flatRate", "Flat-Rate Option: Rate", { default: 2.9, max: 10, step: 0.01 }),
      currencyField("flatFixed", "Flat-Rate Option: Fee per Transaction", { default: 0.3, max: 5, step: 0.01 }),
      currencyField("flatMonthly", "Flat-Rate Option: Monthly Fee", { default: 0, max: 1000, step: 1, required: false }),
      percentField("interchange", "Interchange-Plus: Average Interchange", { default: 1.8, max: 5, step: 0.01 }),
      percentField("markupRate", "Interchange-Plus: Processor Markup", { default: 0.3, max: 5, step: 0.01 }),
      currencyField("markupFixed", "Interchange-Plus: Fee per Transaction", { default: 0.1, max: 5, step: 0.01 }),
      currencyField("icMonthly", "Interchange-Plus: Monthly Fee", { default: 25, max: 1000, step: 1, required: false }),
    ],
    calcResult: { label: "Cheaper Option", format: "number" },
    calcResults: [
      { key: "cheaperOption", label: "Cheaper Option (1 = Flat, 2 = Interchange-Plus)", format: "number", highlight: true },
      { key: "flatRateMonthly", label: "Flat-Rate Monthly Cost", format: "currency" },
      { key: "interchangePlusMonthly", label: "Interchange-Plus Monthly Cost", format: "currency" },
      { key: "monthlySavingsWithCheaper", label: "Monthly Savings With the Cheaper Option", format: "currency" },
      { key: "flatEffectiveRate", label: "Flat-Rate Effective Rate", format: "percentage" },
      { key: "interchangeEffectiveRate", label: "Interchange-Plus Effective Rate", format: "percentage" },
      { key: "yearlyFeesCheaper", label: "Yearly Fees With the Cheaper Option", format: "currency" },
    ],
    instructions:
      "Enter your monthly card sales and number of transactions. Fill in a flat-rate quote (like 2.9% + 30¢) and an interchange-plus quote (average interchange plus the processor's markup and fees).\n\n" +
      "The calculator shows which costs less for your business.",
    examples: "Example: $40,000 a month in 800 transactions. Flat-rate at 2.9% + 30¢ costs $1,400.00; interchange-plus at 1.8% + 0.3% + 10¢ with a $25 monthly fee costs $945.00. Option 2 saves $455.00 a month.",
    assumptions: "Interchange averages about 1.5–2.5% depending on card mix (debit is lower, rewards and business cards higher). Interchange-plus usually wins once card sales pass a few thousand dollars a month. PCI, chargeback and equipment fees aren't included.",
    faq: [
      { question: "What is a good credit card processing rate?", answer: "An effective rate of about 2.5% to 3% is typical for small businesses; larger merchants on interchange-plus can get closer to 2%." },
      { question: "What is interchange-plus pricing?", answer: "You pay the card network's interchange cost plus a fixed markup from the processor, which is more transparent than one flat rate." },
    ],
  },
  {
    slug: "convenience-fee-calculator",
    title: "Convenience Fee Calculator",
    description: "Work out the convenience fee to add so a card payment covers your processing cost — or a flat fee — what the customer pays, and what you actually receive.",
    metaTitle: "Convenience Fee Calculator — Cover Card Fees",
    metaDescription: "Free convenience fee calculator. Find the fee to add to a payment so you net the full amount after card processing, or test a flat fee.",
    calcInputs: [
      currencyField("amount", "Amount You Want to Receive", { default: 500, max: 10000000, step: 0.01 }),
      percentField("processingRate", "Processing Rate", { default: 2.9, max: 10, step: 0.01 }),
      currencyField("processingFixed", "Processing Fee per Payment", { default: 0.3, max: 5, step: 0.01 }),
      dropdown("feeType", "Convenience Fee Type", [["Cover the processing cost exactly", 0], ["Flat fee", 1]], 0),
      currencyField("flatFee", "Flat Fee Amount", { default: 3.95, max: 1000, step: 0.01, required: false }),
    ],
    calcResult: { label: "Convenience Fee", format: "currency" },
    calcResults: [
      { key: "convenienceFee", label: "Convenience Fee", format: "currency", highlight: true },
      { key: "customerPays", label: "Customer Pays", format: "currency" },
      { key: "processingCost", label: "Processing Cost", format: "currency" },
      { key: "youReceive", label: "You Receive", format: "currency" },
      { key: "feeAsPercent", label: "Fee as % of Amount", format: "percentage" },
    ],
    instructions:
      "Enter the amount you want to end up with and your processor's rate and per-payment fee. Choose to cover the processing cost exactly, or test a flat convenience fee.",
    examples: "Example: to receive $500 at 2.9% + 30¢, add a $15.24 fee so the customer pays $515.24 and you receive $500.00.",
    assumptions: "Card networks treat a convenience fee as a flat charge for using an alternative payment channel (like paying online instead of in person), not a percentage on every card sale — that's a surcharge. Some states restrict convenience fees; government agencies and schools use them most.",
    faq: [
      { question: "What's the difference between a convenience fee and a surcharge?", answer: "A convenience fee is a flat charge for paying through an optional channel (like online or by phone); a surcharge is a percentage added to credit card payments to cover the card fee." },
      { question: "How do you calculate a fee that covers card processing?", answer: "Charge (amount + fixed fee) ÷ (1 − rate). Adding just the rate to the amount leaves you slightly short." },
    ],
  },
  {
    slug: "credit-card-surcharge-calculator",
    title: "Credit Card Surcharge Calculator",
    description: "Calculate a credit card surcharge within the 3% cap and your actual processing cost, what the customer pays and what you receive — with debit cards and banned states excluded.",
    metaTitle: "Credit Card Surcharge Calculator — 3% Cap",
    metaDescription: "Free credit card surcharge calculator. Work out a surcharge capped at 3% and your processing cost, with debit cards and banned states excluded.",
    calcInputs: [
      currencyField("saleAmount", "Sale Amount", { default: 200, max: 10000000, step: 0.01 }),
      percentField("processingRate", "Your Processing Rate", { default: 2.9, max: 10, step: 0.01 }),
      currencyField("processingFixed", "Processing Fee per Payment", { default: 0.3, max: 5, step: 0.01 }),
      percentField("surchargeRate", "Surcharge You Want to Charge", { default: 3, max: 10, step: 0.1 }),
      dropdown("cardType", "Card Type", [["Credit card", 0], ["Debit or prepaid card (no surcharge allowed)", 1]], 0),
      dropdown("stateBan", "State Allows Surcharging?", [["Yes", 0], ["No — banned (e.g. Connecticut, Massachusetts)", 1]], 0),
    ],
    calcResult: { label: "Surcharge", format: "currency" },
    calcResults: [
      { key: "surcharge", label: "Surcharge", format: "currency", highlight: true },
      { key: "customerPays", label: "Customer Pays", format: "currency" },
      { key: "processingCost", label: "Processing Cost", format: "currency" },
      { key: "youReceive", label: "You Receive", format: "currency" },
      { key: "surchargeRate", label: "Surcharge Rate Applied", format: "percentage" },
      { key: "feeNotCovered", label: "Fee Not Covered by the Surcharge", format: "currency" },
    ],
    instructions:
      "Enter the sale amount and your processing cost, then the surcharge you'd like to add. Choose the card type and whether your state allows surcharges.\n\n" +
      "The surcharge is limited to your actual cost of acceptance and to 3%.",
    examples: "Example: a $200 credit card sale with processing at 2.9% + 30¢. Your cost is just over 3%, so the surcharge stops at the 3.00% cap — $6.00. The customer pays $206.00, you keep $199.73, and $0.27 of the fee is left uncovered.",
    assumptions: "Visa and Mastercard cap US surcharges at 3% and at the merchant's cost of acceptance; debit and prepaid cards can't be surcharged. Merchants must notify their acquirer and display the surcharge. Connecticut and Massachusetts ban credit card surcharges, and others limit them. Not legal advice.",
    faq: [
      { question: "Is it legal to charge a credit card surcharge?", answer: "In most US states, yes, up to 3% and your actual card cost, with clear disclosure. Connecticut and Massachusetts ban them, and debit cards can't be surcharged anywhere." },
      { question: "How much can I surcharge?", answer: "No more than your cost of accepting the card and no more than 3% under card network rules." },
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
