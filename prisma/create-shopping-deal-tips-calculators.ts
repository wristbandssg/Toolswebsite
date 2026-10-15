// One-time (but safe to re-run) batch setup script: creates 9 tip and service fee tools
// from the user's shopping list (Shopping Calculators > Discount, Tip & Unit Price Calculators).
// See src/lib/calc-engine-shopping-deal-tips.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-deal-tips-calculators.ts
// or
//   npm run db:create-shopping-deal-tips-calculators

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

const ETIQUETTE = "Tipping customs are a guide, not a rule — tip more for great service and adjust for where you live.";

const TOOLS: ToolDef[] = [
  {
    slug: "tattoo-tip-calculator",
    title: "Tattoo Tip Calculator",
    description: "Work out how much to tip your tattoo artist — 15% to 25% of the price — the total to bring, and what the tip works out to per hour in the chair.",
    metaTitle: "Tattoo Tip Calculator — How Much to Tip",
    metaDescription: "Free tattoo tip calculator. Find how much to tip a tattoo artist on any price, the total cost and the tip per session hour, with 15–25% guidance.",
    calcInputs: [
      currencyField("tattooPrice", "Tattoo Price", { default: 400, max: 100000, step: 5 }),
      percentField("tipPercent", "Tip", { default: 20, max: 50, step: 1 }),
      numberField("hours", "Hours in the Chair", { unit: "hours", default: 3, max: 100, step: 0.5, required: false }),
    ],
    calcResult: { label: "Tip", format: "currency" },
    calcResults: [
      { key: "tip", label: "Tip for Your Artist", format: "currency", highlight: true },
      { key: "totalCost", label: "Total With Tip", format: "currency" },
      { key: "tipPerHour", label: "Tip per Hour", format: "currency" },
      { key: "lowTip", label: "15% Tip", format: "currency" },
      { key: "highTip", label: "25% Tip", format: "currency" },
    ],
    instructions:
      "Enter the tattoo's price (the artist's quote or hourly rate × hours) and the tip percentage you want to give. Add the hours if you'd like to see the tip per hour.\n\n" +
      "For multi-session pieces, tip at each session on that session's price.",
    examples: "Example: a $400 tattoo with a 20% tip means $80.00 for the artist and $480.00 in total. Over a 3-hour session that's $26.67 an hour.",
    assumptions: "20% is the usual tattoo tip; 15% for a simple flash piece and 25% or more for custom, detailed or long work. Tip in cash if you can, and tip on the full price even if a deposit was paid earlier. " + ETIQUETTE,
    faq: [
      { question: "How much should you tip a tattoo artist?", answer: "Around 20% of the price. Go to 25% or more for a custom design, a long session or exceptional work." },
      { question: "Do you tip on the deposit?", answer: "Yes — tip on the full price of the tattoo, including the part paid as a deposit." },
      { question: "Do you tip the shop owner if they do your tattoo?", answer: "Tipping an owner is optional but common and always appreciated." },
    ],
  },
  {
    slug: "nail-salon-tip-calculator",
    title: "Nail Salon Tip Calculator",
    description: "Figure out the tip for a manicure, pedicure, gel or acrylic set — on the full price before any coupon — and the total to pay.",
    metaTitle: "Nail Salon Tip Calculator — Manicure & Pedicure",
    metaDescription: "Free nail salon tip calculator. Find how much to tip for a manicure, pedicure, gel or acrylic nails, on the price before discounts, and your total.",
    calcInputs: [
      currencyField("servicePrice", "Service Price (Manicure, Pedicure, Set…)", { default: 55, max: 10000, step: 1 }),
      currencyField("addOns", "Nail Art & Add-Ons", { default: 10, max: 10000, step: 1, required: false }),
      currencyField("discount", "Coupon or Discount", { default: 10, max: 10000, step: 1, required: false }),
      percentField("tipPercent", "Tip", { default: 20, max: 50, step: 1 }),
    ],
    calcResult: { label: "Tip", format: "currency" },
    calcResults: [
      { key: "tip", label: "Tip for Your Nail Tech", format: "currency", highlight: true },
      { key: "totalToPay", label: "Total to Pay", format: "currency" },
      { key: "priceAfterDiscount", label: "Price After Discount", format: "currency" },
      { key: "tipOnDiscountedPrice", label: "Tip If Based on Discounted Price", format: "currency" },
      { key: "tipDifference", label: "Difference", format: "currency" },
    ],
    instructions:
      "Enter the service price and any add-ons like nail art, gems or a gel upgrade, then any coupon or discount.\n\n" +
      "Pick a tip percentage — the tip is figured on the full price, because the tech did the full amount of work.",
    examples: "Example: a $55 gel pedicure with $10 of nail art and a $10 coupon. A 20% tip on the full $65 is $13.00, so you pay $68.00. Tipping on the discounted price would shortchange the tech by $2.00.",
    assumptions: "15–20% is standard at nail salons, 20%+ for detailed art or a long appointment. Tip on the pre-discount price. If two techs work on you (manicure and pedicure), split the tip by the price of each service. " + ETIQUETTE,
    faq: [
      { question: "How much do you tip at a nail salon?", answer: "15% to 20% of the service price, and more for complex nail art or a long appointment." },
      { question: "Do you tip on the price before or after a coupon?", answer: "Before. Your nail tech did the same work, so tip on the full price." },
      { question: "Should I tip for a nail fix?", answer: "Yes — a few dollars for a quick repair, even if it's free." },
    ],
  },
  {
    slug: "massage-tip-calculator",
    title: "Massage Tip Calculator",
    description: "Work out how much to tip for a massage or spa treatment, allowing for any gratuity the spa already added, with guidance for spa, independent and medical massage.",
    metaTitle: "Massage Tip Calculator — Massage & Spa Tips",
    metaDescription: "Free massage and spa tip calculator. Find how much to tip a massage therapist or spa service, minus any gratuity already included, and your total.",
    calcInputs: [
      currencyField("servicePrice", "Massage or Spa Service Price", { default: 120, max: 10000, step: 1 }),
      percentField("tipPercent", "Total Tip You Want to Give", { default: 20, max: 50, step: 1 }),
      percentField("includedGratuity", "Gratuity Already Added by the Spa", { default: 0, max: 30, step: 1, required: false }),
      dropdown("setting", "Where", [["Day spa, resort or massage chain", 0], ["Independent therapist", 1], ["Medical or physical therapy clinic", 2]], 0),
    ],
    calcResult: { label: "Tip", format: "currency" },
    calcResults: [
      { key: "tip", label: "Tip to Add", format: "currency", highlight: true },
      { key: "totalToPay", label: "Total to Pay", format: "currency" },
      { key: "includedGratuity", label: "Gratuity Already Included", format: "currency" },
      { key: "totalGratuity", label: "Total Gratuity", format: "currency" },
      { key: "effectiveTipPercent", label: "Total Gratuity as % of Price", format: "percentage" },
    ],
    instructions:
      "Enter the price of the massage, facial or other spa treatment and the total tip percentage you'd like to give. If the spa automatically adds a gratuity or service charge, enter it so it isn't paid twice.\n\n" +
      "Choose where you had the treatment — tips aren't expected at medical clinics.",
    examples: "Example: a $120 massage at a day spa with a 20% tip and no included gratuity. Add $24.00, for $144.00 in total.",
    assumptions: "18–20% is standard at spas and for independent therapists. Many resorts add an 18–20% service charge — check your bill. Massage as part of physical therapy or a medical treatment isn't usually tipped. " + ETIQUETTE,
    faq: [
      { question: "How much should you tip for a massage?", answer: "About 18% to 20% of the full price. Tip on the original price if you used a discount or gift card." },
      { question: "Do you tip at a spa if a service charge is included?", answer: "Not necessarily — an included service charge usually goes to the staff, so add more only for outstanding service." },
      { question: "Do you tip a massage therapist who owns their business?", answer: "Tipping is optional for owners, but many clients still tip around 15–20%." },
    ],
  },
  {
    slug: "hair-salon-tip-calculator",
    title: "Hair Salon Tip Calculator",
    description: "Split your hair salon tips between the stylist, colorist and shampoo assistant, and see the total to pay for a cut and color.",
    metaTitle: "Hair Salon Tip Calculator — Stylist & Colorist",
    metaDescription: "Free hair salon tip calculator. Work out tips for your stylist, colorist and assistant on a haircut and color, and the total salon bill.",
    calcInputs: [
      currencyField("stylistPrice", "Haircut / Styling Price", { default: 75, max: 10000, step: 1 }),
      currencyField("colorPrice", "Color, Highlights or Treatment", { default: 150, max: 10000, step: 1, required: false }),
      dropdown("sameStylist", "Who Did the Color?", [["A separate colorist", 0], ["My stylist did both", 1]], 0),
      percentField("tipPercent", "Tip", { default: 20, max: 50, step: 1 }),
      currencyField("assistantTip", "Tip for the Shampoo Assistant", { default: 5, max: 500, step: 1, required: false }),
    ],
    calcResult: { label: "Total Tips", format: "currency" },
    calcResults: [
      { key: "totalTips", label: "Total Tips", format: "currency", highlight: true },
      { key: "stylistTip", label: "Stylist's Tip", format: "currency" },
      { key: "coloristTip", label: "Colorist's Tip", format: "currency" },
      { key: "assistantTip", label: "Assistant's Tip", format: "currency" },
      { key: "totalToPay", label: "Total Salon Bill", format: "currency" },
    ],
    instructions:
      "Enter the price of the cut or styling and of any color, highlights or treatment, and say whether a separate colorist did the color.\n\n" +
      "Choose a tip percentage and add a few dollars for the assistant who washed your hair.",
    examples: "Example: a $75 cut and $150 color by a separate colorist with a 20% tip. The stylist gets $15.00, the colorist $30.00, and with $5 for the assistant the tips total $50.00 — $275.00 altogether.",
    assumptions: "15–20% for each person who works on your hair, based on their service's price; $3–$10 for a shampoo assistant. Owners are often tipped too these days. " + ETIQUETTE,
    faq: [
      { question: "How much do you tip a hairstylist?", answer: "15% to 20% of the service price, and 20% or more for complex color or a long appointment." },
      { question: "Do you tip the colorist separately?", answer: "Yes. Each person tips on their own service — the stylist on the cut, the colorist on the color." },
      { question: "How much do you tip the person who washes your hair?", answer: "Usually $3 to $10, given in cash directly to them." },
    ],
  },
  {
    slug: "bartender-tip-calculator",
    title: "Bartender Tip Calculator",
    description: "Work out how much to tip a bartender — $1–$2 a drink or 18–20% of the tab — and compare both methods for your round.",
    metaTitle: "Bartender Tip Calculator — Per Drink or Percent",
    metaDescription: "Free bartender tip calculator. Compare tipping per drink with a percentage of the bar tab and find the tip and total for your round of drinks.",
    calcInputs: [
      currencyField("tab", "Bar Tab", { default: 64, max: 100000, step: 0.5 }),
      numberField("drinks", "Number of Drinks", { default: 6, max: 1000 }),
      dropdown("method", "Tip Method", [["Per drink", 0], ["Percentage of tab", 1]], 0),
      currencyField("perDrink", "Tip per Drink", { default: 2, max: 50, step: 0.5 }),
      percentField("tipPercent", "Tip Percentage", { default: 20, max: 50, step: 1 }),
    ],
    calcResult: { label: "Tip", format: "currency" },
    calcResults: [
      { key: "tip", label: "Tip for the Bartender", format: "currency", highlight: true },
      { key: "totalToPay", label: "Total to Pay", format: "currency" },
      { key: "perDrinkMethod", label: "Per-Drink Tip", format: "currency" },
      { key: "percentMethod", label: "Percentage Tip", format: "currency" },
      { key: "tipPerDrink", label: "Tip per Drink", format: "currency" },
    ],
    instructions:
      "Enter your tab and the number of drinks, then choose whether to tip per drink or as a percentage.\n\n" +
      "Use $1–$2 per beer or simple drink and more for craft cocktails, or 18–20% of the tab.",
    examples: "Example: 6 drinks on a $64 tab. At $2 a drink the tip is $12.00; at 20% it's $12.80. Tipping per drink, you pay $76.00.",
    assumptions: "Per-drink tipping suits beer and simple pours; a percentage suits pricey cocktails or a big tab. Tip on the full value of comped drinks. " + ETIQUETTE,
    faq: [
      { question: "How much do you tip a bartender per drink?", answer: "$1 to $2 for a beer, wine or simple mixed drink, and $2 or more for a craft cocktail." },
      { question: "Should I tip a percentage or per drink?", answer: "Either works. For an expensive tab, 18–20% is fairer; for cheap drinks, $1–$2 each is common." },
    ],
  },
  {
    slug: "delivery-tip-calculator",
    title: "Delivery Tip Calculator",
    description: "Work out a fair tip for food, pizza or grocery delivery — a percentage of the order with a minimum, plus extra for long distances and bad weather.",
    metaTitle: "Delivery Tip Calculator — Food & Pizza Delivery",
    metaDescription: "Free delivery tip calculator for food, pizza and groceries. Find a fair tip with a minimum, extra for distance and bad weather, and your total.",
    calcInputs: [
      currencyField("orderTotal", "Order Total (Food or Groceries)", { default: 42, max: 10000, step: 0.5 }),
      currencyField("deliveryFee", "Delivery & Service Fees", { default: 4.99, max: 500, step: 0.01, required: false }),
      percentField("tipPercent", "Tip", { default: 18, max: 50, step: 1 }),
      currencyField("minimumTip", "Minimum Tip", { default: 5, max: 100, step: 0.5 }),
      numberField("miles", "Distance", { unit: "miles", default: 8, max: 100, step: 0.5, required: false }),
      currencyField("extraPerMile", "Extra per Mile Over 5 Miles", { default: 0.5, max: 10, step: 0.25, required: false }),
      dropdown("badWeather", "Bad Weather?", [["No", 0], ["Yes — rain, snow or extreme heat", 1]], 0),
      currencyField("weatherExtra", "Extra for Bad Weather", { default: 3, max: 50, step: 1, required: false }),
    ],
    calcResult: { label: "Tip", format: "currency" },
    calcResults: [
      { key: "tip", label: "Tip for the Driver", format: "currency", highlight: true },
      { key: "totalToPay", label: "Total to Pay", format: "currency" },
      { key: "baseTip", label: "Base Tip", format: "currency" },
      { key: "distanceAndWeatherExtra", label: "Distance & Weather Extra", format: "currency" },
      { key: "tipAsPercentOfOrder", label: "Tip as % of Order", format: "percentage" },
    ],
    instructions:
      "Enter the order total, the delivery and service fees, a tip percentage and the minimum you'd tip on a small order.\n\n" +
      "Add the distance and whether the weather is bad to add a little extra for the driver.",
    examples: "Example: a $42 pizza order 8 miles away. 18% is $7.56, plus $1.50 for the extra 3 miles, so tip $9.06 and pay $56.05 with fees.",
    assumptions: "15–20% with a $3–$5 minimum is typical for delivery; app delivery and service fees usually don't go to the driver. Tip more for big grocery orders, stairs, long distances or bad weather. " + ETIQUETTE,
    faq: [
      { question: "How much should you tip a delivery driver?", answer: "15% to 20% of the order, with at least $3 to $5, and more for long distances or bad weather." },
      { question: "Does the delivery fee go to the driver?", answer: "Usually not — delivery and service fees mostly go to the restaurant or app. The tip is the driver's." },
      { question: "How much do you tip for pizza delivery?", answer: "15–20% or at least $3–$5 per order, plus a little extra for big orders or bad weather." },
    ],
  },
  {
    slug: "movers-tip-calculator",
    title: "Movers Tip Calculator",
    description: "Work out how much to tip movers — per mover per hour or a percentage of the moving bill — and how much each mover gets.",
    metaTitle: "Movers Tip Calculator — How Much to Tip Movers",
    metaDescription: "Free movers tip calculator. Find how much to tip your moving crew per mover per hour or as a percentage of the bill, and each mover's share.",
    calcInputs: [
      numberField("movers", "Number of Movers", { default: 3, min: 1, max: 20 }),
      numberField("hours", "Hours", { unit: "hours", default: 6, max: 100, step: 0.5 }),
      dropdown("method", "Tip Method", [["Per mover per hour", 0], ["Percentage of moving bill", 1]], 0),
      currencyField("perMoverPerHour", "Tip per Mover per Hour", { default: 5, max: 100, step: 1 }),
      currencyField("moveCost", "Moving Bill", { default: 1400, max: 100000, step: 10, required: false }),
      percentField("tipPercent", "Tip Percentage", { default: 15, max: 30, step: 1, required: false }),
    ],
    calcResult: { label: "Total Tip", format: "currency" },
    calcResults: [
      { key: "totalTip", label: "Total Tip for the Crew", format: "currency", highlight: true },
      { key: "tipPerMover", label: "Tip per Mover", format: "currency" },
      { key: "hourlyMethod", label: "Per-Hour Method", format: "currency" },
      { key: "percentMethod", label: "Percentage Method", format: "currency" },
      { key: "tipAsPercentOfMove", label: "Tip as % of Moving Bill", format: "percentage" },
    ],
    instructions:
      "Enter the number of movers and the hours the move took, then choose to tip per mover per hour ($4–$5 is common) or as a percentage of the bill (10–20%).\n\n" +
      "Give each mover their share directly, in cash if you can.",
    examples: "Example: 3 movers for 6 hours at $5 per mover per hour is $90.00 — $30.00 each, or 6.43% of a $1,400 bill.",
    assumptions: "Typical tips: $4–$5 per mover per hour for local moves, or 10–20% of the bill; for long-distance moves, about 5–10% split between the loading and unloading crews. Tip more for stairs, heavy items or a long day; offering drinks and snacks is a nice touch. " + ETIQUETTE,
    faq: [
      { question: "How much do you tip movers?", answer: "$4 to $5 per mover per hour, or 10% to 20% of the moving cost, given to each mover directly." },
      { question: "Do you tip movers for a long-distance move?", answer: "Yes — tip each crew (loading and unloading), often 5–10% of the total split between them." },
    ],
  },
  {
    slug: "tip-split-calculator",
    title: "Tip Split Calculator",
    description: "Split a tip pool fairly between up to five staff by the hours each worked, after any house share, and see the tips per hour.",
    metaTitle: "Tip Split Calculator — Tip Pool by Hours",
    metaDescription: "Free tip split calculator. Divide a tip pool between servers, bartenders and bussers by hours worked, after any house share, with tips per hour.",
    calcInputs: [
      currencyField("totalTips", "Total Tips in the Pool", { default: 860, max: 1000000, step: 1 }),
      percentField("houseShare", "Share for Back-of-House or Tip-Out", { default: 10, max: 50, step: 1, required: false }),
      numberField("hours1", "Person 1 Hours", { unit: "hours", default: 8, max: 24, step: 0.25 }),
      numberField("hours2", "Person 2 Hours", { unit: "hours", default: 7.5, max: 24, step: 0.25, required: false }),
      numberField("hours3", "Person 3 Hours", { unit: "hours", default: 6, max: 24, step: 0.25, required: false }),
      numberField("hours4", "Person 4 Hours", { unit: "hours", default: 4, max: 24, step: 0.25, required: false }),
      numberField("hours5", "Person 5 Hours", { unit: "hours", default: 0, max: 24, step: 0.25, required: false }),
    ],
    calcResult: { label: "Tips per Hour", format: "currency" },
    calcResults: [
      { key: "tipsPerHour", label: "Tips per Hour Worked", format: "currency", highlight: true },
      { key: "share1", label: "Person 1 Share", format: "currency" },
      { key: "share2", label: "Person 2 Share", format: "currency" },
      { key: "share3", label: "Person 3 Share", format: "currency" },
      { key: "share4", label: "Person 4 Share", format: "currency" },
      { key: "share5", label: "Person 5 Share", format: "currency" },
      { key: "poolAfterHouseShare", label: "Pool After Tip-Out", format: "currency" },
      { key: "totalHours", label: "Total Hours", format: "number" },
    ],
    instructions:
      "Enter the total tips collected in the shift and any share that goes to the kitchen or as a tip-out first.\n\n" +
      "Enter the hours each person worked — leave unused rows at 0. Everyone gets the same rate per hour.",
    examples: "Example: $860 in tips with 10% tipped out to the kitchen leaves $774.00 for 25.5 hours worked — $30.35 an hour. Person 1 (8 hours) gets $242.82 and person 4 (4 hours) gets $121.41.",
    assumptions: "Splitting by hours gives everyone the same hourly tip rate. Some restaurants weight roles with points (for example servers 1.0, bussers 0.5); multiply each person's hours by their points to do that here. Under US law, managers and supervisors can't take part in an employee tip pool.",
    faq: [
      { question: "How do you split tips by hours?", answer: "Divide the total tips by the total hours worked to get a rate per hour, then multiply by each person's hours." },
      { question: "Can kitchen staff share in a tip pool?", answer: "In the US, yes, if the employer doesn't take a tip credit against servers' wages; managers and owners can't join the pool." },
    ],
  },
  {
    slug: "service-fee-calculator",
    title: "Service Fee Calculator",
    description: "Work out a restaurant, event or delivery service fee, whether it's taxed, any extra tip, and how much more you're paying than the menu price.",
    metaTitle: "Service Fee Calculator — Service Charge & Tax",
    metaDescription: "Free service fee calculator. Add a service charge to a bill, apply sales tax, add an extra tip and see how far the total is above menu prices.",
    calcInputs: [
      currencyField("subtotal", "Bill Subtotal", { default: 250, max: 1000000, step: 0.5 }),
      percentField("serviceFeePercent", "Service Fee / Charge", { default: 20, max: 50, step: 0.5 }),
      dropdown("feeTaxable", "Is the Service Fee Taxed?", [["Yes", 1], ["No", 0]], 1),
      percentField("taxRate", "Sales / Meals Tax Rate", { default: 8.875, max: 20, step: 0.001 }),
      percentField("extraTipPercent", "Extra Tip on Top", { default: 0, max: 30, step: 1, required: false }),
    ],
    calcResult: { label: "Total Bill", format: "currency" },
    calcResults: [
      { key: "totalBill", label: "Total Bill", format: "currency", highlight: true },
      { key: "serviceFee", label: "Service Fee", format: "currency" },
      { key: "salesTax", label: "Sales Tax", format: "currency" },
      { key: "extraTip", label: "Extra Tip", format: "currency" },
      { key: "extraAboveMenu", label: "Total Above Menu Prices", format: "percentage" },
    ],
    instructions:
      "Enter the subtotal and the service fee percentage on the bill, then whether the fee is taxed and your tax rate.\n\n" +
      "Add an extra tip only if you want to give more than the service charge.",
    examples: "Example: a $250 group dinner with a 20% service charge that's taxed at 8.875%. The fee is $50.00, tax is $26.63 and the bill is $326.63 — 30.65% above the menu prices.",
    assumptions: "In most US states a mandatory service charge is taxable and belongs to the business, which may share it with staff; a voluntary tip is not taxed and belongs to the worker. Many restaurants add 18–20% for large parties. Check the bill before adding a second tip.",
    faq: [
      { question: "Is a service fee the same as a tip?", answer: "No. A service fee is a mandatory charge set by the business; a tip is voluntary. If there's a service charge, an extra tip is optional." },
      { question: "Is a service charge taxable?", answer: "Usually yes — most states treat a mandatory service charge as part of the taxable sale." },
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
