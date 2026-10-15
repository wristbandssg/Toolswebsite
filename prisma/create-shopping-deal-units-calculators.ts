// One-time (but safe to re-run) batch setup script: creates 11 price per unit, fee and warranty tools
// from the user's shopping list (Shopping Calculators > Discount, Tip & Unit Price Calculators).
// See src/lib/calc-engine-shopping-deal-units.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-deal-units-calculators.ts
// or
//   npm run db:create-shopping-deal-units-calculators

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
    slug: "price-per-ounce-calculator",
    title: "Price per Ounce Calculator",
    description: "Find the price per ounce (or fluid ounce) of two products in any package size — grams, pounds, liters — and see which is the better buy.",
    metaTitle: "Price per Ounce Calculator — Compare Unit Prices",
    metaDescription: "Free price per ounce calculator. Compare the cost per ounce or fluid ounce of two products in any size or unit and find the cheaper one.",
    calcInputs: [
      currencyField("price1", "Product 1 Price", { default: 4.99, max: 1000000, step: 0.01 }),
      numberField("size1", "Product 1 Size", { default: 12, max: 1000000, step: 0.01 }),
      dropdown("unit1", "Product 1 Unit", [["oz (weight)", 0], ["lb", 1], ["g", 2], ["kg", 3], ["fl oz", 4], ["ml", 5], ["L", 6], ["gal", 7], ["qt", 8]], 0),
      currencyField("price2", "Product 2 Price", { default: 7.49, max: 1000000, step: 0.01, required: false }),
      numberField("size2", "Product 2 Size", { default: 20, max: 1000000, step: 0.01, required: false }),
      dropdown("unit2", "Product 2 Unit", [["oz (weight)", 0], ["lb", 1], ["g", 2], ["kg", 3], ["fl oz", 4], ["ml", 5], ["L", 6], ["gal", 7], ["qt", 8]], 0),
    ],
    calcResult: { label: "Product 1 Price per Ounce", format: "currency", decimals: 3 },
    calcResults: [
      { key: "unitPrice1", label: "Product 1 — Price per oz", format: "currency", decimals: 3, highlight: true },
      { key: "unitPrice2", label: "Product 2 — Price per oz", format: "currency", decimals: 3 },
      { key: "cheaperOption", label: "Cheaper Option (Product #)", format: "number" },
      { key: "savingWithCheaper", label: "How Much Cheaper per Unit", format: "percentage" },
      { key: "altUnitPrice1", label: "Product 1 — Price per 100 g / 100 ml", format: "currency" },
      { key: "altUnitPrice2", label: "Product 2 — Price per 100 g / 100 ml", format: "currency" },
    ],
    instructions: "Enter each product's price, package size and unit — the calculator converts between units, so you can compare a pack in grams with one in ounces.\n\nLeave product 2 at 0 to price just one item.",
    examples: "Example: a 12 oz box for $4.99 costs $0.416 per ounce and a 20 oz box for $7.49 costs $0.375. Option 2 is 9.94% cheaper per ounce.",
    assumptions: "Weight ounces (28.35 g) and fluid ounces (29.57 ml) measure different things: the calculator uses ounces for weight units and fluid ounces for volume units, so compare like with like. Grocery shelf tags often show this unit price — check that both use the same unit.",
    faq: [
      { question: "How do you calculate price per ounce?", answer: "Divide the price by the number of ounces in the package. If the size is in grams, divide grams by 28.35 to get ounces first." },
      { question: "Is the bigger package always cheaper per unit?", answer: "Not always. Sales on smaller sizes, and 'shrinkflation' on big packs, can make the smaller package the better buy — so check the unit price." },
    ],
  },
  {
    slug: "price-per-pound-calculator",
    title: "Price per Pound Calculator",
    description: "Work out the price per pound and per kilogram of meat, produce or anything sold by weight, and compare two packages in different sizes or units.",
    metaTitle: "Price per Pound Calculator — Compare Unit Prices",
    metaDescription: "Free price per pound calculator. Find the cost per lb and per kg of two products in ounces, pounds, grams or kilos and pick the better deal.",
    calcInputs: [
      currencyField("price1", "Product 1 Price", { default: 11.99, max: 1000000, step: 0.01 }),
      numberField("size1", "Product 1 Size", { default: 2.5, max: 1000000, step: 0.01 }),
      dropdown("unit1", "Product 1 Unit", [["oz", 0], ["lb", 1], ["g", 2], ["kg", 3]], 1),
      currencyField("price2", "Product 2 Price", { default: 8.49, max: 1000000, step: 0.01, required: false }),
      numberField("size2", "Product 2 Size", { default: 1.5, max: 1000000, step: 0.01, required: false }),
      dropdown("unit2", "Product 2 Unit", [["oz", 0], ["lb", 1], ["g", 2], ["kg", 3]], 1),
    ],
    calcResult: { label: "Product 1 Price per Pound", format: "currency", decimals: 2 },
    calcResults: [
      { key: "unitPrice1", label: "Product 1 — Price per lb", format: "currency", decimals: 2, highlight: true },
      { key: "unitPrice2", label: "Product 2 — Price per lb", format: "currency", decimals: 2 },
      { key: "cheaperOption", label: "Cheaper Option (Product #)", format: "number" },
      { key: "savingWithCheaper", label: "How Much Cheaper per Unit", format: "percentage" },
      { key: "altUnitPrice1", label: "Product 1 — Price per kg", format: "currency" },
      { key: "altUnitPrice2", label: "Product 2 — Price per kg", format: "currency" },
    ],
    instructions: "Enter each product's price, package size and unit — the calculator converts between units, so you can compare a pack in grams with one in ounces.\n\nLeave product 2 at 0 to price just one item.",
    examples: "Example: a 2.5 lb pack for $11.99 is $4.80 a pound ($10.57 a kg); a 1.5 lb pack for $8.49 is $5.66 a pound. Option 1 saves 15.27%.",
    assumptions: "1 lb = 453.59 g = 16 oz; 1 kg = 2.2046 lb. Bone-in meat and produce with stems or peel have waste, so the price per usable pound is higher.",
    faq: [
      { question: "How do you convert price per kg to price per pound?", answer: "Divide the price per kg by 2.2046. For example, $10/kg is $4.54 per pound." },
      { question: "Is the bigger package always cheaper per unit?", answer: "Not always. Sales on smaller sizes, and 'shrinkflation' on big packs, can make the smaller package the better buy — so check the unit price." },
    ],
  },
  {
    slug: "price-per-gram-calculator",
    title: "Price per Gram Calculator",
    description: "Calculate the price per gram (and per 100 g) of spices, coffee, supplements or anything sold in small amounts, and compare two sizes or units.",
    metaTitle: "Price per Gram Calculator — Compare Unit Prices",
    metaDescription: "Free price per gram calculator. Find the cost per gram and per 100 g of two products in grams, ounces or kilos and see which is cheaper.",
    calcInputs: [
      currencyField("price1", "Product 1 Price", { default: 24.99, max: 1000000, step: 0.01 }),
      numberField("size1", "Product 1 Size", { default: 1, max: 1000000, step: 0.01 }),
      dropdown("unit1", "Product 1 Unit", [["oz", 0], ["lb", 1], ["g", 2], ["kg", 3]], 0),
      currencyField("price2", "Product 2 Price", { default: 32, max: 1000000, step: 0.01, required: false }),
      numberField("size2", "Product 2 Size", { default: 50, max: 1000000, step: 0.01, required: false }),
      dropdown("unit2", "Product 2 Unit", [["oz", 0], ["lb", 1], ["g", 2], ["kg", 3]], 2),
    ],
    calcResult: { label: "Product 1 Price per Gram", format: "currency", decimals: 4 },
    calcResults: [
      { key: "unitPrice1", label: "Product 1 — Price per g", format: "currency", decimals: 4, highlight: true },
      { key: "unitPrice2", label: "Product 2 — Price per g", format: "currency", decimals: 4 },
      { key: "cheaperOption", label: "Cheaper Option (Product #)", format: "number" },
      { key: "savingWithCheaper", label: "How Much Cheaper per Unit", format: "percentage" },
      { key: "altUnitPrice1", label: "Product 1 — Price per 100 g", format: "currency" },
      { key: "altUnitPrice2", label: "Product 2 — Price per 100 g", format: "currency" },
    ],
    instructions: "Enter each product's price, package size and unit — the calculator converts between units, so you can compare a pack in grams with one in ounces.\n\nLeave product 2 at 0 to price just one item.",
    examples: "Example: 1 oz of saffron for $24.99 is $0.8815 a gram, while a 50 g jar for $32 is $0.64 a gram — option 2 costs 27.40% less per gram.",
    assumptions: "1 oz = 28.35 g; 1 lb = 453.59 g. Price per 100 g is the unit used on shelf labels in the UK, EU and Australia.",
    faq: [
      { question: "How do you work out price per gram?", answer: "Divide the price by the weight in grams. For price per 100 g, multiply the result by 100." },
      { question: "Is the bigger package always cheaper per unit?", answer: "Not always. Sales on smaller sizes, and 'shrinkflation' on big packs, can make the smaller package the better buy — so check the unit price." },
    ],
  },
  {
    slug: "price-per-liter-calculator",
    title: "Price per Liter Calculator",
    description: "Find the price per liter (and per 100 ml) of drinks, oil, detergent or fuel, and compare two bottles or packs in liters, milliliters, fluid ounces or gallons.",
    metaTitle: "Price per Liter Calculator — Compare Unit Prices",
    metaDescription: "Free price per liter calculator. Compare the cost per liter and per 100 ml of two products in ml, liters, fl oz or gallons and find the better buy.",
    calcInputs: [
      currencyField("price1", "Product 1 Price", { default: 2.79, max: 1000000, step: 0.01 }),
      numberField("size1", "Product 1 Size", { default: 2, max: 1000000, step: 0.01 }),
      dropdown("unit1", "Product 1 Unit", [["fl oz", 4], ["ml", 5], ["L", 6], ["gal", 7], ["qt", 8]], 6),
      currencyField("price2", "Product 2 Price", { default: 1.29, max: 1000000, step: 0.01, required: false }),
      numberField("size2", "Product 2 Size", { default: 500, max: 1000000, step: 0.01, required: false }),
      dropdown("unit2", "Product 2 Unit", [["fl oz", 4], ["ml", 5], ["L", 6], ["gal", 7], ["qt", 8]], 5),
    ],
    calcResult: { label: "Product 1 Price per Liter", format: "currency", decimals: 2 },
    calcResults: [
      { key: "unitPrice1", label: "Product 1 — Price per L", format: "currency", decimals: 2, highlight: true },
      { key: "unitPrice2", label: "Product 2 — Price per L", format: "currency", decimals: 2 },
      { key: "cheaperOption", label: "Cheaper Option (Product #)", format: "number" },
      { key: "savingWithCheaper", label: "How Much Cheaper per Unit", format: "percentage" },
      { key: "altUnitPrice1", label: "Product 1 — Price per 100 ml", format: "currency" },
      { key: "altUnitPrice2", label: "Product 2 — Price per 100 ml", format: "currency" },
    ],
    instructions: "Enter each product's price, package size and unit — the calculator converts between units, so you can compare a pack in grams with one in ounces.\n\nLeave product 2 at 0 to price just one item.",
    examples: "Example: a 2 L bottle for $2.79 is $1.40 a liter; a 500 ml bottle for $1.29 is $2.58 a liter. Option 1 is 45.93% cheaper per liter.",
    assumptions: "1 L = 1,000 ml = 33.81 fl oz; 1 US gallon = 3.785 L. Concentrated products (like detergent) should be compared per use, not per liter.",
    faq: [
      { question: "How do you calculate price per liter?", answer: "Divide the price by the volume in liters. For a 500 ml bottle, divide the price by 0.5." },
      { question: "Is the bigger package always cheaper per unit?", answer: "Not always. Sales on smaller sizes, and 'shrinkflation' on big packs, can make the smaller package the better buy — so check the unit price." },
    ],
  },
  {
    slug: "price-per-gallon-calculator",
    title: "Price per Gallon Calculator",
    description: "Work out the price per gallon (and per quart) of milk, water, paint, fuel or juice, and compare two containers in gallons, quarts, liters or fluid ounces.",
    metaTitle: "Price per Gallon Calculator — Compare Unit Prices",
    metaDescription: "Free price per gallon calculator. Compare the cost per gallon and per quart of two containers in gallons, quarts, liters or fl oz.",
    calcInputs: [
      currencyField("price1", "Product 1 Price", { default: 4.29, max: 1000000, step: 0.01 }),
      numberField("size1", "Product 1 Size", { default: 1, max: 1000000, step: 0.01 }),
      dropdown("unit1", "Product 1 Unit", [["fl oz", 4], ["ml", 5], ["L", 6], ["gal", 7], ["qt", 8]], 7),
      currencyField("price2", "Product 2 Price", { default: 2.49, max: 1000000, step: 0.01, required: false }),
      numberField("size2", "Product 2 Size", { default: 64, max: 1000000, step: 0.01, required: false }),
      dropdown("unit2", "Product 2 Unit", [["fl oz", 4], ["ml", 5], ["L", 6], ["gal", 7], ["qt", 8]], 4),
    ],
    calcResult: { label: "Product 1 Price per Gallon", format: "currency", decimals: 2 },
    calcResults: [
      { key: "unitPrice1", label: "Product 1 — Price per gal", format: "currency", decimals: 2, highlight: true },
      { key: "unitPrice2", label: "Product 2 — Price per gal", format: "currency", decimals: 2 },
      { key: "cheaperOption", label: "Cheaper Option (Product #)", format: "number" },
      { key: "savingWithCheaper", label: "How Much Cheaper per Unit", format: "percentage" },
      { key: "altUnitPrice1", label: "Product 1 — Price per quart", format: "currency" },
      { key: "altUnitPrice2", label: "Product 2 — Price per quart", format: "currency" },
    ],
    instructions: "Enter each product's price, package size and unit — the calculator converts between units, so you can compare a pack in grams with one in ounces.\n\nLeave product 2 at 0 to price just one item.",
    examples: "Example: a gallon of milk for $4.29 vs a 64 fl oz carton for $2.49. The gallon is $4.29 per gallon and the half gallon $4.98 — option 1 is 13.86% cheaper.",
    assumptions: "1 US gallon = 4 quarts = 128 fl oz = 3.785 L. An imperial (UK) gallon is larger, 4.546 L.",
    faq: [
      { question: "How many fluid ounces are in a gallon?", answer: "128 US fluid ounces, or 4 quarts." },
      { question: "Is the bigger package always cheaper per unit?", answer: "Not always. Sales on smaller sizes, and 'shrinkflation' on big packs, can make the smaller package the better buy — so check the unit price." },
    ],
  },
  {
    slug: "rent-to-own-calculator",
    title: "Rent to Own Calculator",
    description: "See what rent-to-own furniture, electronics or appliances really cost — the total of all payments, how much more than the retail price you pay, and the equivalent APR.",
    metaTitle: "Rent to Own Calculator — True Cost & APR",
    metaDescription: "Free rent to own calculator. Add up weekly or monthly rent-to-own payments, compare with the retail price and see the equivalent interest rate.",
    calcInputs: [
      currencyField("retailPrice", "Retail Price of the Item", { default: 900, max: 100000, step: 1 }),
      currencyField("payment", "Payment Amount", { default: 25, max: 10000, step: 0.01 }),
      dropdown("frequency", "Payment Frequency", [["Weekly", 0], ["Every two weeks", 1], ["Monthly", 2]], 0),
      numberField("payments", "Number of Payments to Own It", { default: 78, max: 1000 }),
      currencyField("fees", "Processing, Delivery & Other Fees", { default: 30, max: 10000, step: 1, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Total Cost to Own", format: "currency", highlight: true },
      { key: "extraOverRetail", label: "Extra Paid Over Retail", format: "currency" },
      { key: "costMultiple", label: "Times the Retail Price", format: "number" },
      { key: "impliedApr", label: "Equivalent APR", format: "percentage" },
      { key: "monthsToOwn", label: "Months Until You Own It", format: "number" },
    ],
    instructions:
      "Enter the item's normal retail price (check what a regular store charges), the rent-to-own payment, how often you pay and how many payments it takes to own it.\n\n" +
      "Add any processing, delivery or damage-waiver fees.",
    examples: "Example: a $900 sofa at $25 a week for 78 weeks plus $30 in fees costs $1,980.00 — $1,080.00 more than buying it, 2.2 times the price, which is like borrowing at 126.51% APR.",
    assumptions: "The APR treats the retail price (less upfront fees) as the amount borrowed and the payments as repayments. Many rent-to-own stores offer an early purchase option that cuts the total; ask for its price. Retail comparisons should use the price of the same item new elsewhere.",
    faq: [
      { question: "Is rent-to-own a good idea?", answer: "Rarely — you often pay two to three times the retail price. Saving up, buying used or a low-rate card or loan usually costs far less." },
      { question: "What is an early buyout option?", answer: "Most rent-to-own agreements let you buy the item outright before the end, often for a discount on the remaining payments." },
    ],
  },
  {
    slug: "late-fee-calculator",
    title: "Late Fee Calculator",
    description: "Calculate a late fee on rent, an invoice or a bill — flat, a one-time percentage or a monthly percentage, after any grace period and up to a legal cap — and the total now due.",
    metaTitle: "Late Fee Calculator — Rent, Invoices & Bills",
    metaDescription: "Free late fee calculator. Work out a flat, percentage or monthly late fee on rent or an invoice, with grace period, daily fee and legal cap.",
    calcInputs: [
      currencyField("amountDue", "Amount Due", { default: 1800, max: 10000000, step: 1 }),
      numberField("daysLate", "Days Late", { unit: "days", default: 10, max: 3650 }),
      numberField("graceDays", "Grace Period", { unit: "days", default: 5, max: 60, required: false }),
      dropdown("feeType", "Late Fee Type", [["Flat amount", 0], ["One-time % of amount due", 1], ["% per month (charged daily)", 2]], 1),
      currencyField("flatFee", "Flat Fee", { default: 75, max: 100000, step: 1, required: false }),
      percentField("feeRate", "Fee Rate", { default: 5, max: 50, step: 0.1, required: false }),
      currencyField("dailyFee", "Extra Fee per Day After Grace", { default: 0, max: 1000, step: 1, required: false }),
      percentField("capPercent", "Legal Cap (% of Amount, 0 = None)", { default: 0, max: 50, step: 0.5, required: false }),
    ],
    calcResult: { label: "Late Fee", format: "currency" },
    calcResults: [
      { key: "lateFee", label: "Late Fee", format: "currency", highlight: true },
      { key: "totalDue", label: "Total Now Due", format: "currency" },
      { key: "daysChargeable", label: "Days Charged (After Grace)", format: "number" },
      { key: "feeAsPercentOfDue", label: "Fee as % of Amount Due", format: "percentage" },
      { key: "annualizedRate", label: "Annualized Cost of Paying Late", format: "percentage" },
    ],
    instructions:
      "Enter the amount due, how many days late it is and the grace period from your lease or invoice terms. Choose the fee type and enter the flat amount or rate.\n\n" +
      "Add a daily fee if your agreement has one, and a cap if your state limits late fees (for example 5% of rent in several states).",
    examples: "Example: $1,800 rent paid 10 days late with a 5-day grace period and a 5% late fee. The fee is $90.00, so $1,890.00 is now due.",
    assumptions: "Late fees must be in the lease or contract and be 'reasonable'; many states cap rent late fees (often 5–10% of rent) and require a grace period. Invoice late fees are commonly 1–1.5% per month. This is a calculation, not legal advice.",
    faq: [
      { question: "How much can a landlord charge for a late fee?", answer: "It depends on the state. Many cap it at around 5% of rent or a fixed amount, and some require a grace period of 3–5 days." },
      { question: "What is a typical invoice late fee?", answer: "1% to 1.5% per month on the overdue balance, or a flat fee, as stated in the payment terms." },
    ],
  },
  {
    slug: "restocking-fee-calculator",
    title: "Restocking Fee Calculator",
    description: "Work out how much you'll get back when returning an item with a restocking fee, return shipping and non-refundable original shipping, and what the return really costs.",
    metaTitle: "Restocking Fee Calculator — Refund After Fees",
    metaDescription: "Free restocking fee calculator. Find your refund after a restocking fee and shipping costs, and what returning an item really costs you.",
    calcInputs: [
      currencyField("itemPrice", "Item Price", { default: 650, max: 1000000, step: 0.01 }),
      percentField("feePercent", "Restocking Fee", { default: 15, max: 50, step: 1 }),
      currencyField("returnShipping", "Return Shipping You Pay", { default: 25, max: 10000, step: 0.01, required: false }),
      currencyField("originalShipping", "Original Shipping Paid", { default: 20, max: 10000, step: 0.01, required: false }),
      dropdown("shippingRefunded", "Is Original Shipping Refunded?", [["No", 0], ["Yes", 1]], 0),
    ],
    calcResult: { label: "Refund", format: "currency" },
    calcResults: [
      { key: "refund", label: "Refund You'll Get", format: "currency", highlight: true },
      { key: "restockingFee", label: "Restocking Fee", format: "currency" },
      { key: "totalCostOfReturning", label: "Total Cost of Returning", format: "currency" },
      { key: "lostAsPercentOfPrice", label: "Lost as % of Price", format: "percentage" },
    ],
    instructions:
      "Enter the item price and the store's restocking fee (usually 15–25% for opened electronics, furniture and special orders), then the return shipping you'll pay and the original shipping.\n\n" +
      "Choose whether the store refunds the original shipping.",
    examples: "Example: returning a $650 item with a 15% restocking fee and $25 return shipping, with $20 of original shipping not refunded. You get back $527.50, and the return costs you $142.50 in all.",
    assumptions: "Restocking fees are usually a percentage of the item price, not including tax; sales tax is normally refunded in full. Many stores waive the fee for defective or unopened items, and some states require the fee to be disclosed at purchase.",
    faq: [
      { question: "What is a restocking fee?", answer: "A charge some sellers deduct from a refund to cover inspecting, repackaging and reselling a returned item — commonly 15% to 25%." },
      { question: "Can I avoid a restocking fee?", answer: "Often, if the item is defective, unopened or the fee wasn't disclosed. Ask for an exchange or store credit, which may be fee-free." },
    ],
  },
  {
    slug: "extended-warranty-calculator",
    title: "Extended Warranty Calculator",
    description: "Decide whether an extended warranty or protection plan is worth it for electronics or appliances, from its price, the chance of a repair and the repair cost.",
    metaTitle: "Extended Warranty Calculator — Is It Worth It?",
    metaDescription: "Free extended warranty calculator. Compare a protection plan's price with the expected repair cost and the break-even chance of a breakdown.",
    calcInputs: [
      currencyField("productPrice", "Product Price", { default: 1200, max: 1000000, step: 1 }),
      currencyField("warrantyCost", "Extended Warranty Price", { default: 199, max: 100000, step: 1 }),
      percentField("failureChance", "Chance It Needs a Covered Repair During the Plan", { default: 15, max: 100, step: 1 }),
      currencyField("repairCost", "Typical Repair Cost", { default: 450, max: 1000000, step: 1 }),
      currencyField("deductible", "Deductible per Claim", { default: 0, max: 10000, step: 1, required: false }),
    ],
    calcResult: { label: "Expected Value", format: "currency" },
    calcResults: [
      { key: "expectedValue", label: "Expected Value of the Warranty", format: "currency", highlight: true },
      { key: "expectedRepairCost", label: "Expected Repair Cost Without It", format: "currency" },
      { key: "warrantyAsPercentOfPrice", label: "Warranty as % of Product Price", format: "percentage" },
      { key: "breakEvenFailureChance", label: "Break-Even Chance of a Repair", format: "percentage" },
      { key: "worthIt", label: "Worth It on Average? (1 = Yes)", format: "number" },
    ],
    instructions:
      "Enter the product's price, the protection plan's price, a realistic chance it will need a repair after the manufacturer's warranty ends but before the plan does, and what a repair would cost.\n\n" +
      "Add any deductible. A negative expected value means you're likely to pay more for the plan than it pays out.",
    examples: "Example: a $199 plan on a $1,200 laptop with a 15% chance of a $450 repair. The expected repair cost is $67.50, so the plan's expected value is −$131.50. It only pays off on average if the repair chance is above 44.22%.",
    assumptions: "Expected value = chance of a repair × (repair cost − deductible) − plan price, for a single repair. Most products fail rarely in years 2–3, which is why sellers profit from plans. Plans can make sense for fragile, portable or very expensive items, or if an unexpected repair bill would be a hardship. Check what your credit card already extends.",
    faq: [
      { question: "Are extended warranties worth it?", answer: "Usually not on average — the price is often higher than the expected cost of repairs. They can be worth it for accident-prone portable devices or if a big repair bill would be hard to cover." },
      { question: "Do credit cards give extended warranties?", answer: "Some cards add a year to the manufacturer's warranty on items you buy with them, which may make a store plan unnecessary." },
    ],
  },
  {
    slug: "warranty-refund-calculator",
    title: "Warranty Refund Calculator",
    description: "Estimate the pro-rated refund for cancelling an extended car warranty or service contract, by months or miles used — whichever is greater — less the cancellation fee and claims paid.",
    metaTitle: "Warranty Refund Calculator — Cancel & Pro-Rate",
    metaDescription: "Free warranty refund calculator. Estimate the pro-rated refund when cancelling an extended warranty or service contract, by time or miles used.",
    calcInputs: [
      currencyField("contractPrice", "Contract Price Paid", { default: 2800, max: 1000000, step: 1 }),
      numberField("termMonths", "Contract Term", { unit: "months", default: 60, max: 240 }),
      numberField("monthsUsed", "Months Used", { unit: "months", default: 14, max: 240 }),
      numberField("termMiles", "Mileage Limit (0 = Time Only)", { unit: "miles", default: 75000, max: 1000000, step: 1000, required: false }),
      numberField("milesUsed", "Miles Driven Since Purchase", { unit: "miles", default: 15000, max: 1000000, step: 100, required: false }),
      currencyField("cancelFee", "Cancellation Fee", { default: 75, max: 10000, step: 1, required: false }),
      currencyField("claimsPaid", "Claims Already Paid (If Deducted)", { default: 0, max: 1000000, step: 1, required: false }),
    ],
    calcResult: { label: "Refund", format: "currency" },
    calcResults: [
      { key: "refund", label: "Estimated Refund", format: "currency", highlight: true },
      { key: "percentUsed", label: "Share of Contract Used", format: "percentage" },
      { key: "unusedValue", label: "Unused Value", format: "currency" },
      { key: "cancellationFee", label: "Cancellation Fee", format: "currency" },
      { key: "refundPercentOfPrice", label: "Refund as % of Price", format: "percentage" },
    ],
    instructions:
      "Enter what you paid for the contract, its term in months and how many months you've had it. If it also has a mileage limit, enter it and the miles you've driven since buying it — the refund uses whichever share is larger.\n\n" +
      "Add the cancellation fee and any claims the contract says are deducted.",
    examples: "Example: a $2,800, 5-year/75,000-mile contract cancelled after 14 months and 15,000 miles. Time used (23.33%) is more than miles used (20%), so the unused value is $2,146.67 and the refund after a $75 fee is $2,071.67.",
    assumptions: "Most vehicle service contracts refund the unused portion pro rata by time or miles, whichever is greater, minus a cancellation fee (often $50–$100). Some contracts deduct claims paid; within the first 30–60 days many refund in full. If the contract was financed, the refund usually goes to the lender.",
    faq: [
      { question: "Can I get a refund on an extended car warranty?", answer: "Yes. Most service contracts can be cancelled any time for a pro-rated refund, and many give a full refund in the first 30 to 60 days." },
      { question: "How is a warranty refund pro-rated?", answer: "By the share of time or miles used, whichever is greater. If you've used 23% of the term, you get about 77% back, less any fee." },
    ],
  },
  {
    slug: "home-warranty-calculator",
    title: "Home Warranty Calculator",
    description: "Decide whether a home warranty is worth it by comparing the yearly premium and service fees with what your likely appliance and system repairs would cost, including coverage caps.",
    metaTitle: "Home Warranty Calculator — Is It Worth It?",
    metaDescription: "Free home warranty calculator. Compare home warranty premiums and service call fees with expected repair costs and coverage caps.",
    calcInputs: [
      currencyField("monthlyPremium", "Monthly Premium", { default: 55, max: 10000, step: 1 }),
      currencyField("serviceFee", "Service Call Fee per Claim", { default: 100, max: 1000, step: 5 }),
      numberField("callsPerYear", "Repair Calls You Expect per Year", { default: 2, max: 50, step: 0.5 }),
      currencyField("avgRepairCost", "Average Repair Cost Without a Warranty", { default: 450, max: 100000, step: 10 }),
      currencyField("coverageCap", "Coverage Cap per Item (0 = None)", { default: 2000, max: 100000, step: 100, required: false }),
    ],
    calcResult: { label: "Yearly Savings", format: "currency" },
    calcResults: [
      { key: "yearlySavings", label: "Yearly Savings With the Warranty", format: "currency", highlight: true },
      { key: "costWithWarranty", label: "Yearly Cost With the Warranty", format: "currency" },
      { key: "costWithoutWarranty", label: "Yearly Repair Cost Without It", format: "currency" },
      { key: "annualPremium", label: "Annual Premium", format: "currency" },
      { key: "breakEvenRepairsPerYear", label: "Repairs per Year to Break Even", format: "number" },
    ],
    instructions:
      "Enter the warranty's monthly premium and service call fee, how many repairs you'd realistically need in a year and what each typically costs to fix yourself.\n\n" +
      "Add the per-item coverage cap from the contract. A negative saving means the warranty costs more than it's likely to save.",
    examples: "Example: $55 a month with a $100 service fee and two $450 repairs a year. With the warranty you'd pay $860.00; without it, $900.00. You'd need about 1.89 repairs a year to break even.",
    assumptions: "Home warranties typically cost $40–$80 a month plus $75–$150 per service call, and exclude pre-existing problems and improper maintenance. Coverage caps can leave you paying part of a big repair. Older homes with ageing systems benefit most.",
    faq: [
      { question: "Is a home warranty worth it?", answer: "It can be for older homes with ageing appliances and HVAC. For newer homes or with an emergency fund, paying for repairs yourself is usually cheaper." },
      { question: "What does a home warranty cover?", answer: "Repairs or replacement of major systems and appliances from normal wear — heating, cooling, plumbing, electrical, kitchen appliances — up to coverage limits." },
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
