// One-time (but safe to re-run) batch setup script: creates 8 special tax tools
// from the user's shopping list (Shopping Calculators > Sales Tax, VAT & Import
// Duty Calculators): DC sales tax, sales tax deduction, restaurant, hotel,
// excise, luxury (Canada), boat sales tax and cannabis tax.
// See src/lib/calc-engine-shopping-tax-special.ts.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-tax-special-calculators.ts
// or
//   npm run db:create-shopping-tax-special-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Sales Tax, VAT & Import Duty Calculators", slug: "sales-tax-vat-import-duty-calculators" };

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

const CHECK = "Tax rates change; check the current rate with the state or local tax office before relying on the result.";

const TOOLS: ToolDef[] = [
  {
    slug: "dc-sales-tax-calculator",
    title: "DC Sales Tax Calculator",
    description: "Calculate Washington, DC sales tax on a purchase, restaurant meal, hotel stay or parking — or work back from a total to the price before tax.",
    metaTitle: "DC Sales Tax Calculator — Washington, DC Rates",
    metaDescription: "Free DC sales tax calculator. Find Washington, DC sales tax on goods, restaurant meals, alcohol, hotels and parking, or remove tax from a total.",
    calcInputs: [
      currencyField("amount", "Amount", { default: 100, max: 10000000, step: 0.01 }),
      dropdown("category", "What You're Buying", [["General goods — 6.5%", 6.5], ["Restaurant meals, alcohol & rental cars — 10%", 10], ["Hotel rooms — 14.95%", 14.95], ["Parking — 18%", 18], ["Soft drinks — 8%", 8]], 6.5),
      dropdown("mode", "The Amount Is", [["Before tax — add tax", 0], ["Total including tax — remove tax", 1]], 0),
    ],
    calcResult: { label: "DC Sales Tax", format: "currency" },
    calcResults: [
      { key: "salesTax", label: "DC Sales Tax", format: "currency", highlight: true },
      { key: "priceBeforeTax", label: "Price Before Tax", format: "currency" },
      { key: "totalWithTax", label: "Total With Tax", format: "currency" },
      { key: "taxRate", label: "Tax Rate Used", format: "percentage" },
    ],
    instructions:
      "Enter the amount and choose what you're buying — DC charges different rates for goods, restaurant meals, hotel rooms and parking.\n\n" +
      "Choose whether the amount is before tax or already includes tax.",
    examples: "Example: a $100 purchase of general goods in DC at 6.5% carries $6.50 of tax, for a total of $106.50.",
    assumptions:
      "DC has one city-wide rate for each category and no separate county tax. The general rate rose from 6% in October 2025; restaurant meals, liquor sold for on-site drinking and rental cars are 10%, hotels 14.95% and commercial parking 18%. " + CHECK,
    faq: [
      { question: "What is the sales tax in Washington, DC?", answer: "The general rate is 6.5% (raised from 6% in October 2025). Restaurant meals and alcohol are 10%, hotel rooms 14.95% and parking 18%." },
      { question: "Is there local sales tax in DC?", answer: "No. DC is a single taxing district, so the same rate applies everywhere in the city." },
      { question: "Are groceries taxed in DC?", answer: "Most groceries are exempt, but prepared food, candy and soft drinks are taxed." },
    ],
  },
  {
    slug: "sales-tax-deduction-calculator",
    title: "Sales Tax Deduction Calculator",
    description: "See whether deducting sales tax or state income tax saves you more on your federal return, and how much fits under the 2026 SALT cap with property tax.",
    metaTitle: "Sales Tax Deduction Calculator — SALT 2026",
    metaDescription: "Free sales tax deduction calculator. Compare deducting sales tax vs state income tax, add property tax and apply the 2026 $40,400 SALT cap.",
    calcInputs: [
      currencyField("taxablePurchases", "Taxable Purchases This Year", { default: 30000, max: 10000000, step: 100 }),
      percentField("salesTaxRate", "Your Combined Sales Tax Rate", { default: 8, max: 15, step: 0.01 }),
      currencyField("bigPurchaseTax", "Sales Tax on a Car, Boat or Home Build", { default: 2500, max: 1000000, step: 10, required: false }),
      currencyField("stateIncomeTax", "State & Local Income Tax Paid", { default: 2000, max: 10000000, step: 10, required: false }),
      currencyField("propertyTax", "Property Taxes Paid", { default: 5000, max: 10000000, step: 10, required: false }),
      currencyField("magi", "Modified Adjusted Gross Income", { default: 120000, max: 100000000, step: 1000 }),
      dropdown("filingStatus", "Filing Status", [["Single, joint or head of household", 0], ["Married filing separately", 1]], 0),
      percentField("marginalRate", "Federal Tax Bracket", { default: 22, max: 37, step: 1 }),
    ],
    calcResult: { label: "SALT Deduction", format: "currency" },
    calcResults: [
      { key: "saltDeduction", label: "SALT Deduction You Can Take", format: "currency", highlight: true },
      { key: "salesTaxDeduction", label: "Sales Tax Deduction", format: "currency" },
      { key: "incomeTaxDeduction", label: "Income Tax Deduction", format: "currency" },
      { key: "salesTaxIsBetter", label: "Deduct Sales Tax? (1 = Yes, 0 = Income Tax)", format: "number" },
      { key: "saltCap", label: "Your SALT Cap", format: "currency" },
      { key: "federalTaxSaved", label: "Federal Tax Saved", format: "currency" },
    ],
    instructions:
      "Enter your taxable purchases for the year and your combined sales tax rate, plus the sales tax on any big purchase such as a car or boat. Then enter the state and local income tax you paid and your property taxes.\n\n" +
      "Add your income, filing status and federal tax bracket to see the deduction and what it saves.",
    examples:
      "Example: $30,000 of purchases at 8% plus $2,500 of sales tax on a car gives a $4,900.00 sales tax deduction — more than the $2,000 of state income tax. " +
      "With $5,000 of property tax, the SALT deduction is $9,900.00, which saves $2,178.00 in the 22% bracket.",
    assumptions:
      "You can deduct state and local sales tax or income tax — not both — plus property tax, only if you itemize. For 2026 the SALT cap is $40,400 ($20,200 married filing separately), cut by 30% of income over $505,000 but never below $10,000. Instead of receipts, the IRS also lets you use its sales tax tables plus big purchases. It only helps if your itemized deductions beat the standard deduction.",
    faq: [
      { question: "Can I deduct both sales tax and state income tax?", answer: "No. You choose one, plus property taxes, and the total is limited by the SALT cap." },
      { question: "Who benefits from the sales tax deduction?", answer: "People in states with no income tax (like Texas, Florida or Washington), low earners with big purchases, and anyone who bought a car, boat or RV that year." },
      { question: "What is the SALT cap for 2026?", answer: "$40,400 for most filers, reduced for incomes over $505,000 but never below $10,000." },
    ],
  },
  {
    slug: "restaurant-tax-calculator",
    title: "Restaurant Tax Calculator",
    description: "Work out the meals tax, tip and service charge on a restaurant bill — tipping on the pre-tax or after-tax amount — and what each person owes.",
    metaTitle: "Restaurant Tax Calculator — Meals Tax & Tip",
    metaDescription: "Free restaurant tax calculator. Add meals tax, tip and service charge to a restaurant bill, tip before or after tax, and split it per person.",
    calcInputs: [
      currencyField("subtotal", "Food & Drink Subtotal", { default: 120, max: 100000, step: 0.01 }),
      percentField("mealsTaxRate", "Meals Tax Rate", { default: 9, max: 20, step: 0.001 }),
      percentField("tipPercent", "Tip", { default: 18, max: 50, step: 1 }),
      dropdown("tipOn", "Tip On", [["Pre-tax amount", 0], ["Total after tax", 1]], 0),
      percentField("serviceCharge", "Service Charge Added by Restaurant", { default: 0, max: 30, step: 0.5, required: false }),
      numberField("people", "Number of People", { default: 4, min: 1, max: 100 }),
    ],
    calcResult: { label: "Total Bill", format: "currency" },
    calcResults: [
      { key: "totalBill", label: "Total Bill", format: "currency", highlight: true },
      { key: "mealsTax", label: "Meals Tax", format: "currency" },
      { key: "tip", label: "Tip", format: "currency" },
      { key: "serviceCharge", label: "Service Charge", format: "currency" },
      { key: "perPerson", label: "Each Person Pays", format: "currency" },
      { key: "taxAndTipShare", label: "Tax, Tip & Charges as % of Food", format: "percentage" },
    ],
    instructions:
      "Enter the food and drink subtotal and your area's meals tax rate (state + local + any restaurant tax). Choose a tip percentage and whether you tip on the pre-tax or after-tax amount.\n\n" +
      "Add any service charge the restaurant adds, and the number of people splitting the bill.",
    examples:
      "Example: a $120 bill with 9% meals tax and an 18% tip on the pre-tax amount. Tax is $10.80, the tip is $21.60 and the total is $152.40 — $38.10 each for four people.",
    assumptions:
      "Many cities add a restaurant or prepared-food tax on top of sales tax (for example 10% in DC, about 8.875% in New York City and up to 10.25% in Chicago). Tipping on the pre-tax amount is standard etiquette. A service charge is not a tip and may be taxable in some states. " + CHECK,
    faq: [
      { question: "Should I tip on the pre-tax or post-tax amount?", answer: "Etiquette experts say tip on the pre-tax amount, though many people tip on the total for simplicity — the difference is small." },
      { question: "Why is restaurant tax higher than sales tax?", answer: "Many cities and counties add a meals or prepared-food tax on top of the regular sales tax to fund tourism or local projects." },
      { question: "Is a service charge the same as a tip?", answer: "No. A service charge is a fee set by the restaurant and may be taxable; a tip is voluntary and goes to staff." },
    ],
  },
  {
    slug: "hotel-tax-calculator",
    title: "Hotel Tax Calculator",
    description: "Calculate the taxes on a hotel stay — occupancy and sales tax, flat nightly taxes and resort fees — and the real cost per night.",
    metaTitle: "Hotel Tax Calculator — Occupancy Tax & Resort Fees",
    metaDescription: "Free hotel tax calculator. Add hotel occupancy tax, sales tax, flat nightly fees and resort fees to your room rate to see the real cost of a stay.",
    calcInputs: [
      currencyField("nightlyRate", "Nightly Room Rate", { default: 189, max: 100000, step: 1 }),
      numberField("nights", "Nights", { default: 3, max: 365 }),
      numberField("rooms", "Rooms", { default: 1, min: 1, max: 100 }),
      percentField("taxRate", "Hotel Tax Rate (Sales + Occupancy)", { default: 14.75, max: 40, step: 0.01 }),
      currencyField("flatPerNight", "Flat Tax per Room-Night", { default: 0, max: 1000, step: 0.01, required: false }),
      currencyField("resortFee", "Resort / Destination Fee per Night", { default: 35, max: 1000, step: 1, required: false }),
    ],
    calcResult: { label: "Total Stay Cost", format: "currency" },
    calcResults: [
      { key: "totalStayCost", label: "Total Stay Cost", format: "currency", highlight: true },
      { key: "totalTax", label: "Total Hotel Tax", format: "currency" },
      { key: "roomCost", label: "Room Charges", format: "currency" },
      { key: "resortFees", label: "Resort Fees", format: "currency" },
      { key: "costPerNight", label: "Real Cost per Room-Night", format: "currency" },
      { key: "effectiveTaxRate", label: "Tax as % of Room Rate", format: "percentage" },
    ],
    instructions:
      "Enter the nightly rate, nights and number of rooms, then the combined hotel tax rate for the city — state and local sales tax plus hotel occupancy tax.\n\n" +
      "Add any flat per-night tax (New York City charges $2 plus a $1.50 hotel unit fee) and the resort or destination fee, which is taxed like the room.",
    examples:
      "Example: 3 nights at $189 with a 14.75% hotel tax and a $35 nightly resort fee. Tax comes to $99.12, the stay costs $771.12, and the real cost per night is $257.04 — not $189.",
    assumptions:
      "Percentage taxes apply to the room rate and the resort fee. Typical combined rates: New York City about 14.75% plus $3.50 a night, Chicago about 17.4%, Los Angeles about 15.7%, Las Vegas about 13.4%. Some states exempt stays over 30 days. " + CHECK,
    faq: [
      { question: "Why is hotel tax so high?", answer: "Cities and states add occupancy and tourism taxes on top of sales tax, because visitors don't vote locally — combined rates of 13–18% are common." },
      { question: "Are resort fees taxed?", answer: "Usually yes. Resort and destination fees are treated as part of the room charge, so the same hotel tax applies." },
      { question: "Do long stays avoid hotel tax?", answer: "In many states, stays of more than 30 consecutive days are exempt from occupancy tax." },
    ],
  },
  {
    slug: "excise-tax-calculator",
    title: "Excise Tax Calculator",
    description: "Calculate an excise tax charged per unit (like per gallon, pack or bottle) or as a percentage of price, with sales tax on top, and its share of the final price.",
    metaTitle: "Excise Tax Calculator — Per Unit or Percent",
    metaDescription: "Free excise tax calculator. Work out a per-unit or ad valorem excise tax with sales tax on top and see how much of the price goes to tax.",
    calcInputs: [
      currencyField("unitPrice", "Price per Unit Before Tax", { default: 3.5, max: 1000000, step: 0.01 }),
      numberField("quantity", "Quantity (Units, Gallons, Packs…)", { default: 15, max: 10000000, step: 0.1 }),
      dropdown("exciseType", "Excise Charged", [["Per unit (specific)", 1], ["As a % of price (ad valorem)", 0]], 1),
      numberField("exciseRate", "Excise Rate ($ per Unit or %)", { default: 0.184, max: 100000, step: 0.001 }),
      percentField("salesTaxRate", "Sales Tax on Price + Excise", { default: 0, max: 20, step: 0.01, required: false }),
    ],
    calcResult: { label: "Excise Tax", format: "currency" },
    calcResults: [
      { key: "exciseTax", label: "Excise Tax", format: "currency", highlight: true },
      { key: "salesTax", label: "Sales Tax", format: "currency" },
      { key: "totalTax", label: "Total Tax", format: "currency" },
      { key: "totalPrice", label: "Total Price", format: "currency" },
      { key: "taxShareOfPrice", label: "Tax Share of Final Price", format: "percentage" },
      { key: "excisePerUnit", label: "Excise per Unit", format: "currency" },
    ],
    instructions:
      "Enter the price per unit and the quantity. Choose whether the excise is a fixed amount per unit (fuel per gallon, cigarettes per pack, alcohol per gallon) or a percentage of the price (like the 10% federal tax on bows or 3% on airline tickets).\n\n" +
      "Enter the excise rate and any sales tax charged on the price including excise.",
    examples:
      "Example: 15 gallons of gas at $3.50 with the 18.4¢ federal excise tax. The excise is $2.76 — 4.99% of the $55.26 total.",
    assumptions:
      "Specific excise = rate × quantity; ad valorem excise = rate × price. Sales tax, where it applies, is charged on the price including excise. Excise taxes are often already in the shelf price; enter the pre-excise price to see them separately. Federal rates: gasoline 18.4¢/gal, diesel 24.4¢/gal, cigarettes $1.01/pack.",
    faq: [
      { question: "What is an excise tax?", answer: "A tax on specific goods or activities — fuel, alcohol, tobacco, airline tickets, firearms — usually paid by the maker or seller and passed on in the price." },
      { question: "What's the difference between excise tax and sales tax?", answer: "Sales tax applies to most purchases as a percentage at checkout. Excise tax applies only to certain products, often per unit, and is built into the price." },
    ],
  },
  {
    slug: "luxury-tax-calculator",
    title: "Luxury Tax Calculator",
    description: "Calculate Canada's luxury tax on cars and aircraft over $100,000 or boats over $250,000 — the lesser of 10% of the price or 20% of the amount over the threshold — plus GST/HST.",
    metaTitle: "Luxury Tax Calculator — Canada Cars, Boats & Planes",
    metaDescription: "Free luxury tax calculator for Canada. Find the luxury tax on cars and aircraft over $100,000 and boats over $250,000, plus GST/HST on the tax.",
    calcInputs: [
      numberField("price", "Price (Before GST/HST)", { unit: "CAD", default: 150000, max: 100000000, step: 100 }),
      dropdown("itemType", "Item", [["Car, SUV or aircraft — $100,000 threshold", 0], ["Boat — $250,000 threshold", 1]], 0),
      dropdown("salesTaxRate", "GST/HST in Your Province", [["Ontario — 13% HST", 13], ["Nova Scotia — 14% HST", 14], ["New Brunswick, Newfoundland, PEI — 15% HST", 15], ["Other provinces — 5% GST", 5]], 13),
    ],
    calcResult: { label: "Luxury Tax", format: "currency", currency: "CAD" },
    calcResults: [
      { key: "luxuryTax", label: "Luxury Tax", format: "currency", currency: "CAD", highlight: true },
      { key: "tenPercentMethod", label: "10% of Full Price", format: "currency", currency: "CAD" },
      { key: "twentyPercentMethod", label: "20% of Amount Over Threshold", format: "currency", currency: "CAD" },
      { key: "gstHstOnLuxuryTax", label: "GST/HST on the Luxury Tax", format: "currency", currency: "CAD" },
      { key: "totalWithTaxes", label: "Total With Luxury Tax & GST/HST", format: "currency", currency: "CAD" },
      { key: "threshold", label: "Threshold", format: "currency", currency: "CAD" },
    ],
    instructions:
      "Enter the price before GST/HST, including options and accessories, and choose whether it's a car or aircraft or a boat.\n\n" +
      "Pick your province to add GST or HST, which is charged on both the price and the luxury tax.",
    examples:
      "Example: a C$150,000 car in Ontario. 10% of the price is C$15,000.00, while 20% of the C$50,000 over the threshold is C$10,000.00, so the luxury tax is the lower C$10,000.00. HST on the luxury tax adds C$1,300.00.",
    assumptions:
      "Canada's Select Luxury Items Tax Act applies to new cars and aircraft over C$100,000 and boats over C$250,000 bought after 2022. The tax is the lesser of 10% of the full taxable value and 20% of the value above the threshold. GST/HST applies to the luxury tax too. Provincial sales tax, used vehicles and some business-use exemptions aren't modelled.",
    faq: [
      { question: "What is Canada's luxury tax?", answer: "A federal tax on new cars and aircraft priced over $100,000 and boats over $250,000: the lower of 10% of the price or 20% of the amount above the threshold." },
      { question: "Does GST apply to the luxury tax?", answer: "Yes. GST or HST is calculated on the price including the luxury tax." },
      { question: "Does the US have a luxury tax on cars?", answer: "No. The US federal luxury tax on cars was repealed in 2002; only the gas-guzzler tax remains on some low-mileage models." },
    ],
  },
  {
    slug: "boat-sales-tax-calculator",
    title: "Boat Sales Tax Calculator",
    description: "Calculate sales tax on a new or used boat by state, including state caps like Florida's $18,000 maximum and South Carolina's $500 limit, and your trade-in credit.",
    metaTitle: "Boat Sales Tax Calculator — State Caps Included",
    metaDescription: "Free boat sales tax calculator. Find sales tax on a boat in your state, with tax caps (FL, SC, NC, MD, VA, NY), local surtax and trade-in credit.",
    calcInputs: [
      currencyField("price", "Boat Price (With Engine & Trailer)", { default: 120000, max: 100000000, step: 100 }),
      currencyField("tradeIn", "Trade-In Value", { default: 0, max: 10000000, step: 100, required: false }),
      dropdown("state", "State", [["Other state — enter rate", 0], ["Florida — 6%, max $18,000", 1], ["South Carolina — 5%, max $500", 2], ["North Carolina — 3%, max $1,500", 3], ["Maryland — 5% excise, max $15,000", 4], ["Virginia — 2%, max $2,000", 5], ["New Jersey — 3.3125%", 6], ["Connecticut — 2.99%", 7], ["New York — 4% + local, first $230,000", 8], ["Texas — 6.25%", 9], ["California — 7.25% + district", 10], ["Massachusetts — 6.25%", 11], ["Rhode Island — exempt", 12], ["No sales tax (OR, NH, DE, MT, AK)", 13]], 1),
      percentField("stateRate", "State Rate (Other State Only)", { default: 6, max: 15, step: 0.01, required: false }),
      percentField("localRate", "Local / County Rate", { default: 1, max: 10, step: 0.01, required: false }),
    ],
    calcResult: { label: "Boat Sales Tax", format: "currency" },
    calcResults: [
      { key: "boatSalesTax", label: "Boat Sales Tax", format: "currency", highlight: true },
      { key: "stateTax", label: "State Tax", format: "currency" },
      { key: "localTax", label: "Local Tax", format: "currency" },
      { key: "taxSavedByCap", label: "Tax Saved by the State Cap", format: "currency" },
      { key: "totalCost", label: "Price After Trade-In + Tax", format: "currency" },
      { key: "effectiveRate", label: "Tax as % of Price", format: "percentage" },
    ],
    instructions:
      "Enter the boat's price including the engine and trailer, and any trade-in. Pick your state — the calculator applies its rate and any cap on boat tax — or choose Other and enter the rate.\n\n" +
      "Add the local or county rate if your state has one (Florida's county surtax only applies to the first $5,000).",
    examples:
      "Example: a $120,000 boat registered in Florida. 6% would be $7,200, under the $18,000 cap, and the 1% county surtax on the first $5,000 adds $50.00 — $7,250.00 in total.",
    assumptions:
      "Caps used: Florida $18,000 state tax per boat; South Carolina $500; North Carolina $1,500; Maryland $15,000 vessel excise; Virginia $2,000; New York taxes only the first $230,000. Rhode Island exempts boats. Many states let a trade-in reduce the taxable price; a trailer may be taxed separately. Buying in one state and keeping the boat in another usually triggers use tax there. " + CHECK,
    faq: [
      { question: "Which states have the lowest boat sales tax?", answer: "Rhode Island exempts boats, Oregon, New Hampshire, Delaware, Montana and Alaska have no sales tax, and South Carolina caps it at $500." },
      { question: "Is there a cap on boat sales tax in Florida?", answer: "Yes. Florida's 6% state tax is capped at $18,000 per boat; county surtax applies only to the first $5,000." },
      { question: "Can I avoid boat sales tax by buying in another state?", answer: "Usually not. Your home state charges use tax when you register or keep the boat there, minus any tax paid elsewhere." },
    ],
  },
  {
    slug: "cannabis-price-tax-calculator",
    title: "Cannabis Price & Tax Calculator",
    description: "Calculate the out-the-door price of cannabis with state excise tax, local cannabis tax and sales tax, plus the after-tax price per gram.",
    metaTitle: "Cannabis Tax Calculator — Price After Tax",
    metaDescription: "Free cannabis price and tax calculator. Add state excise, local cannabis tax and sales tax to the shelf price and see the after-tax price per gram.",
    calcInputs: [
      currencyField("shelfPrice", "Shelf Price Before Tax", { default: 40, max: 100000, step: 0.01 }),
      numberField("grams", "Amount", { unit: "grams", default: 3.5, max: 10000, step: 0.1 }),
      percentField("exciseRate", "State Cannabis Excise Tax", { default: 15, max: 50, step: 0.01 }),
      percentField("localCannabisRate", "Local Cannabis Tax", { default: 4, max: 25, step: 0.01, required: false }),
      percentField("salesTaxRate", "Sales Tax", { default: 9.5, max: 15, step: 0.01, required: false }),
    ],
    calcResult: { label: "Price After Tax", format: "currency" },
    calcResults: [
      { key: "totalPrice", label: "Price After Tax", format: "currency", highlight: true },
      { key: "totalTax", label: "Total Tax", format: "currency" },
      { key: "exciseTax", label: "State Excise Tax", format: "currency" },
      { key: "localCannabisTax", label: "Local Cannabis Tax", format: "currency" },
      { key: "salesTax", label: "Sales Tax", format: "currency" },
      { key: "pricePerGram", label: "After-Tax Price per Gram", format: "currency" },
      { key: "effectiveTaxRate", label: "Total Tax Rate on Shelf Price", format: "percentage" },
    ],
    instructions:
      "Enter the shelf price and the amount in grams (an eighth is 3.5 g). Enter your state's cannabis excise rate, any city or county cannabis tax, and the sales tax.\n\n" +
      "The defaults follow California: 15% excise plus local tax, with sales tax charged on top.",
    examples:
      "Example: a $40 eighth with 15% excise, 4% local cannabis tax and 9.5% sales tax costs $52.12 — $12.12 in tax, an effective 30.31%, or $14.89 a gram.",
    assumptions:
      "Excise and local cannabis taxes are charged on the shelf price; sales tax on the price plus those taxes, as in California. Other states differ: Washington charges 37% excise, Colorado 15%, Illinois 10–25% by potency, Michigan 10%, New York 13% plus potency taxes. Medical cannabis is often exempt from some taxes. " + CHECK,
    faq: [
      { question: "Why is cannabis tax so high?", answer: "Most legal states stack a cannabis excise tax, local cannabis taxes and regular sales tax, so total tax often reaches 25–40% of the shelf price." },
      { question: "Is medical cannabis taxed?", answer: "In many states medical patients skip the excise or sales tax with a valid card — check your state's rules." },
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
