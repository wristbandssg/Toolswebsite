// One-time (but safe to re-run) batch setup script: creates 12 calculators in Food & Drink
// Calculators > Food Costs, Restaurant Prices & Business Calculators. Formulas and dated prices live
// in src/lib/calc-engine-food-biz.ts; examples are computed from the engine.
//
// HOW TO RUN (after prisma/setup-food-drink-category.ts --apply)
//   npx tsx prisma/create-food-biz-calculators.ts
// or
//   npm run db:create-food-biz-calculators

import * as E from "../src/lib/calc-engine-food-biz";

import { PrismaClient, Prisma } from "@prisma/client";
import { trvMovedCategoryId } from "./setup-travel-category";

const prisma = new PrismaClient();

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function numberField(key: string, label: string, opts: { unit?: string; default?: number; min?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "number", unit: opts.unit, required: true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 1000, step: opts.step ?? 1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "currency", required: true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000, step: opts.step ?? 1 };
}

function percentField(key: string, label: string, opts: { default?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "percentage", unit: "%", required: true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100, step: opts.step ?? 0.5 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

interface ToolDef {
  slug: string;
  cat: string;
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

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { maximumFractionDigits: d });
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const opts = (labels: string[]) => labels.map((l, i) => [l, i] as [string, number]);
const num = (key: string, label: string, def: number, max = 100000, step = 1, min = 0) => numberField(key, label, { default: def, max, step, min });
const pct = (key: string, label: string, def: number, max = 100, step = 0.1) => percentField(key, label, { default: def, max, step });
const cur = (key: string, label: string, def: number, max = 100000, step = 0.01) => currencyField(key, label, { default: def, max, step });
const FMT = { c: "currency", n: "number", p: "percentage", d: "date" } as const;
type Line = [key: string, label: string, fmt: keyof typeof FMT];

const FB = "food-costs-restaurant-prices-business-calculators";
const NOTES: Record<string, string> = {
  [FB]: "Prices and rates are typical 2026 figures that change often and vary by location — edit any default to match your own menu, quote or receipt. This site is independent and not affiliated with any restaurant, cruise line or theme park named here.",
};

interface Spec { slug: string; cat: string; title: string; desc: string; meta?: string; inputs: Record<string, unknown>[]; results: Line[]; fn: E.CustomCalculator; ex: Record<string, number>; exText: (o: Record<string, number>) => string; how: string; assume: string; faq: [string, string][] }
function mk(s: Spec): ToolDef {
  const o = r(s.fn, s.ex);
  const [, mainLabel, mainFmt] = s.results[0];
  return {
    slug: s.slug,
    cat: s.cat,
    title: s.title,
    description: s.desc,
    metaTitle: (s.meta ?? `${s.title} — Free Online Calculator`).slice(0, 70),
    metaDescription: s.desc.length > 158 ? `${s.desc.slice(0, 155).replace(/\s+\S*$/, "")}…` : s.desc,
    calcInputs: s.inputs,
    calcResult: { label: mainLabel, format: FMT[mainFmt] },
    calcResults: s.results.map(([key, label, f], i) => ({ key, label, format: FMT[f], ...(i === 0 ? { highlight: true } : {}) })),
    instructions: s.how,
    examples: s.exText(o),
    assumptions: `${s.assume} ${NOTES[s.cat]}`,
    faq: s.faq.map(([question, answer]) => ({ question, answer })),
  };
}

const MENU_INPUTS = (menu: [string, number][], qty: number[]) => menu.flatMap(([name, price], i) => [num(`qty${i + 1}`, `${name} — quantity`, qty[i] ?? 0, 100, 1), cur(`price${i + 1}`, `${name} — price`, price, 200)]);
const ORDER_EXTRAS = [pct("taxRate", "Sales Tax", 7, 15, 0.05), num("people", "People Sharing the Order", 1, 100, 1, 1), pct("appMarkup", "Delivery-App Menu Markup (0 if ordering in store)", 0, 50, 1), cur("deliveryFee", "Delivery Fee", 0, 50), pct("serviceFeePercent", "App Service Fee", 0, 30, 0.5), pct("tipPercent", "Tip", 0, 50, 1)];
const ORDER_RESULTS: Line[] = [["orderTotal", "Order Total", "c"], ["subtotal", "Food Subtotal", "c"], ["tax", "Sales Tax", "c"], ["deliveryExtras", "Delivery Markup, Fees & Tip", "c"], ["perPerson", "Per Person", "c"], ["items", "Items", "n"]];
const exOrder = (menu: [string, number][], qty: number[]) => Object.fromEntries([...menu.flatMap(([, price], i) => [[`qty${i + 1}`, qty[i] ?? 0], [`price${i + 1}`, price]]), ["taxRate", 7], ["people", 1], ["appMarkup", 0], ["deliveryFee", 0], ["serviceFeePercent", 0], ["tipPercent", 0]]) as Record<string, number>;
const ORDER_HOW = "Enter how many of each item you want; prices are typical US menu prices and can be changed to match your local restaurant or app. For delivery, add the app's menu markup (often 15–30%), delivery fee, service fee and tip to see the real cost.";

const TOOLS: ToolDef[] = [
  mk({
    slug: "disney-dining-plan-calculator", cat: FB, title: "Disney Dining Plan Calculator (Is It Worth It?)",
    desc: "See whether the Walt Disney World Quick-Service Dining Plan or Disney Dining Plan saves you money — 2026 plan prices versus what your family would spend paying for meals and snacks out of pocket.",
    meta: "Disney Dining Plan Calculator — 2026 Cost vs Paying Out of Pocket",
    inputs: [dropdown("plan", "Plan", opts(["Quick-Service Dining Plan", "Disney Dining Plan (table service)"]), 0), num("nights", "Nights", 5, 30, 1, 1), num("adults", "Adults & Kids 10+", 2, 20, 1), num("kids", "Children 3–9", 2, 20, 1), dropdown("kidsFree", "Kids Free Promotion on Your Package?", opts(["No", "Yes"]), 0), cur("adultPlanPrice", "Plan Price per Adult per Night", 60.47, 300), cur("childPlanPrice", "Plan Price per Child per Night", 26.16, 200), cur("adultQsMeal", "Typical Quick-Service Meal, Adult (with drink)", 24, 100), cur("kidQsMeal", "Typical Quick-Service Meal, Child", 12, 100), cur("adultTsMeal", "Typical Table-Service Meal, Adult (before tip)", 55, 200), cur("kidTsMeal", "Typical Table-Service Meal, Child", 22, 100), cur("snack", "Typical Snack", 7, 50), pct("usagePercent", "Share of Credits You Will Really Use", 90, 100, 1), pct("taxRate", "Sales Tax", 6.5, 15, 0.05)],
    results: [["savings", "Savings With the Plan (negative = you lose)", "c"], ["planCost", "Plan Cost (with tax)", "c"], ["outOfPocketValue", "Same Food Paid Out of Pocket", "c"], ["planCostPerPersonPerDay", "Plan Cost per Person per Day", "c"], ["breakEvenUsePercent", "Credits You Must Use to Break Even (%)", "n"], ["creditsTotal", "Total Meal & Snack Credits", "n"]],
    fn: E.disneyDining, ex: { plan: 0, nights: 5, adults: 2, kids: 2, kidsFree: 0, adultPlanPrice: 60.47, childPlanPrice: 26.16, adultQsMeal: 24, kidQsMeal: 12, adultTsMeal: 55, kidTsMeal: 22, snack: 7, usagePercent: 90, taxRate: 6.5 },
    exText: (o) => `Example: two adults and two kids on the Quick-Service plan for 5 nights pay about ${usd(o.planCost)}; the same food bought separately is about ${usd(o.outOfPocketValue)}, a difference of ${usd(o.savings)}.`,
    how: "Choose the plan and enter your party. Then set what you would typically order — the plan pays best if you order the priciest entrées and drinks, and poorly if you share meals or skip snacks.\n\nIf the plan comes with a 'kids dine free' package, choose Yes.",
    assume: "2026 prices per night before tax: Quick-Service $60.47 adult, $26.16 child; Disney Dining Plan $98.59 adult, $31.94 child. Quick-Service gives 2 quick-service meals + 1 snack per person per night; the Disney Dining Plan gives 1 quick-service + 1 table-service meal + 1 snack. Gratuities are not included. Prices change every year — check Disney's site.",
    faq: [["Is the Disney Dining Plan worth it in 2026?", "Usually only if you use every credit on full-price entrées and snacks; many families save more paying as they go."], ["Does the Disney Dining Plan include tips?", "No — gratuity is extra at table-service restaurants."]],
  }),
  mk({
    slug: "carnival-drink-package-calculator", cat: FB, title: "Carnival Drink Package Calculator (CHEERS! Worth It?)",
    desc: "Find out whether Carnival's CHEERS! beverage package is worth it — the 2026 daily price with the service charge versus paying for cocktails, beer, wine, soda and coffee as you go, with the break-even number of drinks.",
    meta: "Carnival Drink Package Calculator — Is CHEERS! Worth It?",
    inputs: [num("days", "Cruise Length (days)", 7, 30, 1, 1), num("adults", "Adults 21+ in Your Cabin (all must buy)", 2, 8, 1, 1), cur("packagePrice", "CHEERS! Price per Person per Day", 69.95, 200), pct("serviceCharge", "Package Service Charge", 20, 30, 1), num("cocktails", "Cocktails per Day", 4, 30, 1), cur("cocktailPrice", "Cocktail Price", 13.5, 50), num("beers", "Beers per Day", 2, 30, 1), cur("beerPrice", "Beer Price", 8.5, 50), num("wines", "Glasses of Wine per Day", 1, 30, 1), cur("winePrice", "Wine Price", 11, 50), num("sodas", "Sodas / Juices per Day", 2, 30, 1), cur("sodaPrice", "Soda Price", 3.25, 20), num("coffees", "Specialty Coffees per Day", 1, 30, 1), cur("coffeePrice", "Specialty Coffee Price", 4.95, 20), pct("drinkGratuity", "Gratuity Added to Each Bar Drink", 18, 30, 1)],
    results: [["savings", "Savings With CHEERS! (negative = you lose)", "c"], ["packageCost", "Package Cost for the Cabin", "c"], ["payAsYouGoCost", "Pay-as-You-Go Cost", "c"], ["packagePerPersonPerDay", "Package per Person per Day (with charge)", "c"], ["breakEvenCocktailsPerDay", "Cocktails per Day to Break Even", "n"], ["payAsYouGoPerPersonPerDay", "Your Drinks per Person per Day", "c"]],
    fn: E.carnivalCheers, ex: { days: 7, adults: 2, packagePrice: 69.95, serviceCharge: 20, cocktails: 4, cocktailPrice: 13.5, beers: 2, beerPrice: 8.5, wines: 1, winePrice: 11, sodas: 2, sodaPrice: 3.25, coffees: 1, coffeePrice: 4.95, drinkGratuity: 18 },
    exText: (o) => `Example: two adults having 4 cocktails, 2 beers, a glass of wine, 2 sodas and a coffee a day would pay ${usd(o.payAsYouGoCost)} as they go versus ${usd(o.packageCost)} for CHEERS! over 7 days. Break-even is about ${o.breakEvenCocktailsPerDay} cocktails a day.`,
    how: "Enter your sailing and a realistic daily drink count for each adult. Carnival requires every adult 21+ in the cabin to buy CHEERS! if one does, and caps it at 15 alcoholic drinks a day.\n\nBuying before you sail is cheaper than buying onboard.",
    assume: "2026 pre-cruise price $69.95 per person per day plus a 20% service charge ($83.94); onboard about $89.94. Bar drinks add an 18% gratuity. Drink prices are typical fleet prices and vary by ship and venue.",
    faq: [["Is the Carnival drink package worth it?", "Usually if each adult has about 5–6 or more cocktails a day; otherwise pay as you go."], ["Does everyone in the cabin have to buy CHEERS!?", "Yes — all guests 21 and over in the same stateroom must purchase it."]],
  }),
  mk({
    slug: "catering-pricing-calculator", cat: FB, title: "Catering Pricing Calculator (Price per Person for Caterers)",
    desc: "Price a catering job: food cost per guest, staff labor, rentals, overhead and your profit margin give the price per person and a full quote with service charge and tax.",
    meta: "Catering Pricing Calculator — How Much to Charge per Person",
    inputs: [num("guests", "Guests", 100, 100000, 1, 1), cur("foodCostPerGuest", "Food & Beverage Cost per Guest", 14, 1000), num("staffHours", "Total Staff Hours (all staff)", 40, 10000, 0.5), cur("hourlyRate", "Average Staff Cost per Hour", 22, 200), cur("rentals", "Rentals & Equipment", 400, 100000), cur("otherCosts", "Other Direct Costs (delivery, disposables)", 150, 100000), pct("overheadPercent", "Overhead (kitchen, insurance, admin)", 15, 100, 1), pct("profitMargin", "Target Profit Margin", 20, 90, 1), pct("serviceCharge", "Service Charge to Client", 18, 30, 0.5), pct("taxRate", "Sales Tax", 7, 15, 0.05)],
    results: [["pricePerGuest", "Price per Guest (before service charge & tax)", "c"], ["quoteBeforeTax", "Quote incl. Service Charge", "c"], ["totalWithTax", "Total With Tax", "c"], ["totalCost", "Your Total Cost", "c"], ["profit", "Profit", "c"], ["foodCostPercent", "Food Cost % of Price", "n"], ["laborCost", "Labor Cost", "c"]],
    fn: E.cateringPricing, ex: { guests: 100, foodCostPerGuest: 14, staffHours: 40, hourlyRate: 22, rentals: 400, otherCosts: 150, overheadPercent: 15, profitMargin: 20, serviceCharge: 18, taxRate: 7 },
    exText: (o) => `Example: 100 guests at $14 food cost with 40 staff hours comes to ${usd(o.pricePerGuest)} per guest — a quote of ${usd(o.totalWithTax)} with service charge and tax, and ${usd(o.profit)} profit.`,
    how: "Cost the menu per guest (ingredients plus beverages), estimate staff hours for prep, travel, service and clean-up, and add rentals. Overhead covers your kitchen, insurance and admin.\n\nMost caterers aim for a food cost of 28–35% of the price.",
    assume: "Price = (food + labor + rentals + other) × (1 + overhead) ÷ (1 − margin). The service charge and sales tax are added on top; in many states the service charge is taxable too.",
    faq: [["How much should I charge for catering per person?", "Typically $25–75 per guest for buffets and $50–150+ for plated service, depending on your costs and market."], ["What food cost percentage should a caterer target?", "About 28–35% of the menu price."]],
  }),
  mk({
    slug: "wine-business-calculator", cat: FB, title: "Winery Business Calculator (Cost per Bottle & Profit)",
    desc: "Model a small winery or wine label: grape cost, production and packaging per bottle, federal excise, fixed costs and a direct-to-consumer and wholesale sales mix — with cost per bottle, revenue and profit.",
    meta: "Wine Business Calculator — Cost per Bottle and Winery Profit",
    inputs: [num("tons", "Grapes (tons)", 20, 100000, 0.5), cur("pricePerTon", "Grape Price per Ton", 2000, 50000), num("bottlesPerTon", "Bottles per Ton (≈ 720)", 720, 1000, 10, 400), cur("productionPerBottle", "Production Cost per Bottle (yeast, oak, labor)", 3, 100), cur("packagingPerBottle", "Packaging per Bottle (glass, cork, label, case)", 2.5, 50), cur("excisePerGallon", "Federal Excise per Gallon (small producer ≈ $0.07)", 0.07, 10), cur("fixedCosts", "Annual Fixed Costs", 60000, 100000000, 100), pct("dtcShare", "Share Sold Direct to Consumer", 40, 100, 1), cur("dtcPrice", "Direct-to-Consumer Price per Bottle", 32, 1000), pct("dtcCostPercent", "Direct Sales Cost (tasting room, club, shipping)", 15, 80, 1), cur("wholesalePrice", "Wholesale Price per Bottle", 14, 500)],
    results: [["profit", "Annual Profit", "c"], ["costPerBottle", "Total Cost per Bottle", "c"], ["bottles", "Bottles", "n"], ["cases", "Cases", "n"], ["totalCost", "Total Cost", "c"], ["revenue", "Net Revenue", "c"], ["profitMargin", "Profit Margin (%)", "n"], ["breakEvenPricePerBottle", "Break-Even Average Price", "c"]],
    fn: E.wineBusiness, ex: { tons: 20, pricePerTon: 2000, bottlesPerTon: 720, productionPerBottle: 3, packagingPerBottle: 2.5, excisePerGallon: 0.07, fixedCosts: 60000, dtcShare: 40, dtcPrice: 32, dtcCostPercent: 15, wholesalePrice: 14 },
    exText: (o) => `Example: 20 tons of $2,000 grapes make ${fmt(o.bottles, 0)} bottles at ${usd(o.costPerBottle)} each. Selling 40% direct at $32 and the rest wholesale at $14 leaves ${usd(o.profit)} a year.`,
    how: "Enter your grape volume and price (or the bulk-wine equivalent), your per-bottle costs and the fixed costs of the year (rent, salaries, insurance, licences). Direct sales earn far more per bottle but cost more to run.\n\nWholesale is usually about half of the shelf price; distributors then add their margin.",
    assume: "1 ton of grapes ≈ 150–170 gallons ≈ 720 bottles (60 cases). Federal excise for wine up to 16% ABV is $1.07/gal, reduced by the small-producer credit to about $0.07 on the first 30,000 gallons; state excise is extra. A 750 mL bottle is 0.198 gal.",
    faq: [["How much does it cost to make a bottle of wine?", "Small wineries often spend $8–20 per bottle all-in, depending on grape prices and scale."], ["How many bottles of wine from a ton of grapes?", "About 720 bottles, or 60 cases."]],
  }),
  mk({
    slug: "mcdonalds-price-calculator", cat: FB, title: "McDonald's Price Calculator (Order Total)",
    desc: "Add up a McDonald's order — Big Mac, Quarter Pounder, McNuggets, McChicken, Egg McMuffin, fries, drinks and McFlurry — with tax, delivery-app markup, fees and tip, at typical 2026 prices you can edit.",
    meta: "McDonald's Price Calculator — Order Total With Tax & Delivery",
    inputs: [...MENU_INPUTS(E.MENUS.mcdonalds, [2, 0, 1, 0, 0, 2, 2, 0]), ...ORDER_EXTRAS], results: ORDER_RESULTS,
    fn: E.mcdonaldsPrice, ex: exOrder(E.MENUS.mcdonalds, [2, 0, 1, 0, 0, 2, 2, 0]),
    exText: (o) => `Example: two Big Macs, a 10-piece McNuggets, two medium fries and two drinks come to about ${usd(o.orderTotal)} with 7% tax.`,
    how: ORDER_HOW, assume: "Typical 2026 US menu prices: Big Mac $5.99, Quarter Pounder with Cheese $6.49, 10-pc McNuggets $5.99, McChicken $3.29, Egg McMuffin $4.79, medium fries $3.89, medium drink $1.99, McFlurry $4.59. Franchise prices vary a lot by city; app deals and value menus can be cheaper.",
    faq: [["How much is a Big Mac in 2026?", "About $5.50–6.50 on its own in most of the US, more in big cities and airports."], ["Is McDonald's more expensive on DoorDash or Uber Eats?", "Usually yes — menu prices are often 15–30% higher, plus fees and tip."]],
  }),
  mk({
    slug: "chipotle-price-calculator", cat: FB, title: "Chipotle Price Calculator (Order Total)",
    desc: "Price a Chipotle order — chicken, steak, barbacoa, carnitas or veggie bowls and burritos, chips and guac, extra guac, kid's meals and drinks — with tax and delivery extras, at typical prices you can edit.",
    meta: "Chipotle Price Calculator — Bowl, Burrito & Order Total",
    inputs: [...MENU_INPUTS(E.MENUS.chipotle, [1, 1, 0, 0, 1, 0, 0, 2]), ...ORDER_EXTRAS], results: ORDER_RESULTS,
    fn: E.chipotlePrice, ex: exOrder(E.MENUS.chipotle, [1, 1, 0, 0, 1, 0, 0, 2]),
    exText: (o) => `Example: a chicken bowl, a steak burrito, chips and guac and two drinks cost about ${usd(o.orderTotal)} with tax.`,
    how: ORDER_HOW, assume: "Typical 2026 US prices: chicken or veggie entrée $10.70, steak $12.40, barbacoa or carnitas $11.95, chips & guacamole $5.95, extra guac $2.95, kid's meal $6.25, drink $3.25. Chipotle prices differ by market (higher in NYC, LA and SF).",
    faq: [["How much is a Chipotle bowl?", "A chicken bowl is around $10–11 in most US markets in 2026."], ["Is guac extra at Chipotle?", "Yes on meat entrées; it is included with the veggie bowl."]],
  }),
  mk({
    slug: "in-n-out-price-calculator", cat: FB, title: "In-N-Out Price Calculator (Order Total)",
    desc: "Add up an In-N-Out order — Double-Double, cheeseburgers, hamburgers, fries, combos, shakes, drinks and Animal Style — with tax, at typical 2026 prices you can edit.",
    meta: "In-N-Out Price Calculator — Double-Double & Order Total",
    inputs: [...MENU_INPUTS(E.MENUS.innout, [2, 0, 0, 2, 0, 1, 1, 0]), ...ORDER_EXTRAS], results: ORDER_RESULTS,
    fn: E.innoutPrice, ex: exOrder(E.MENUS.innout, [2, 0, 0, 2, 0, 1, 1, 0]),
    exText: (o) => `Example: two Double-Doubles, two fries, a shake and a drink come to about ${usd(o.orderTotal)} with tax.`,
    how: ORDER_HOW, assume: "Typical 2026 California prices: Double-Double $5.65, cheeseburger $3.95, hamburger $3.45, fries $2.45, Double-Double combo $9.85, shake $3.25, medium drink $2.35. Prices are a little higher in some states and airports. In-N-Out does not use delivery apps in every area.",
    faq: [["How much is a Double-Double?", "About $5.50–6 in 2026 depending on the state."], ["What is Animal Style?", "Mustard-cooked patty, pickles, grilled onions and extra spread — a small upcharge on fries."]],
  }),
  mk({
    slug: "starbucks-price-calculator", cat: FB, title: "Starbucks Price Calculator (Drink & Order Cost)",
    desc: "Work out what a Starbucks order costs — lattes, brewed coffee, Frappuccinos, cold brew, Refreshers, breakfast sandwiches, pastries and add-ons — with tax, at typical 2026 grande prices you can edit.",
    meta: "Starbucks Price Calculator — Grande Drink & Order Total",
    inputs: [...MENU_INPUTS(E.MENUS.starbucks, [1, 0, 1, 0, 0, 1, 0, 1]), ...ORDER_EXTRAS], results: ORDER_RESULTS,
    fn: E.starbucksPrice, ex: exOrder(E.MENUS.starbucks, [1, 0, 1, 0, 0, 1, 0, 1]),
    exText: (o) => `Example: a grande latte, a Frappuccino, a breakfast sandwich and one extra shot cost about ${usd(o.orderTotal)} with tax.`,
    how: ORDER_HOW + "\n\nTall drinks are usually about 40–50 cents less than grande, and venti about 40–60 cents more.",
    assume: "Typical 2026 US grande prices: latte $5.75, brewed coffee $3.45, Frappuccino $6.15, cold brew $5.25, Refresher $5.45; breakfast sandwich $5.45, pastry $3.95; extra shot or syrup about $1. Starbucks no longer charges extra for non-dairy milk (since November 2024).",
    faq: [["How much is a grande latte at Starbucks?", "About $5.25–6.25 in most US cities in 2026."], ["Does oat milk cost extra at Starbucks?", "No — Starbucks dropped the non-dairy milk charge in late 2024."]],
  }),
  mk({
    slug: "restaurants-carbon-calculator", cat: FB, title: "Restaurant Carbon Footprint Calculator",
    desc: "Estimate a restaurant's yearly carbon footprint from the food it buys (beef, lamb, cheese, pork, poultry, seafood, dairy, grains, produce) and its electricity and gas — in tonnes of CO₂e and per cover.",
    meta: "Restaurant Carbon Calculator — Food & Energy CO₂ Footprint",
    inputs: [...E.EMISSIONS.map(([k, n]) => num(k, `${n} Bought per Week (kg)`, ({ beefKg: 40, poultryKg: 60, cheeseKg: 15, porkKg: 20, produceKg: 150, grainsKg: 80, dairyKg: 40 } as Record<string, number>)[k] ?? 0, 100000, 0.5)), num("kwhPerMonth", "Electricity per Month (kWh)", 8000, 10000000, 10), num("gridFactor", "Grid Emissions (kg CO₂ per kWh; US avg 0.373)", 0.373, 1.5, 0.001), num("thermsPerMonth", "Natural Gas per Month (therms)", 600, 1000000, 1), num("coversPerWeek", "Covers (Meals Served) per Week", 1500, 1000000, 1)],
    results: [["annualTonnesCo2e", "Annual Footprint (tonnes CO₂e)", "n"], ["foodTonnes", "From Food (t CO₂e)", "n"], ["energyTonnes", "From Energy (t CO₂e)", "n"], ["kgPerCover", "Per Meal Served (kg CO₂e)", "n"], ["beefSharePercent", "Share From Beef (%)", "n"], ["carsEquivalent", "Equivalent Cars Driven for a Year", "n"]],
    fn: E.restaurantCarbon, ex: { beefKg: 40, lambKg: 0, cheeseKg: 15, prawnsKg: 0, porkKg: 20, fishKg: 0, poultryKg: 60, eggsKg: 0, dairyKg: 40, riceKg: 0, grainsKg: 80, produceKg: 150, kwhPerMonth: 8000, gridFactor: 0.373, thermsPerMonth: 600, coversPerWeek: 1500 },
    exText: (o) => `Example: a restaurant buying 40 kg of beef and 60 kg of poultry a week has a footprint of about ${o.annualTonnesCo2e} tonnes CO₂e a year — ${o.kgPerCover} kg per meal, with ${fmt(o.beefSharePercent, 0)}% from beef.`,
    how: "Use your weekly purchasing (invoices are the easiest source) and your utility bills. Use your utility's or eGRID region's emission factor if you know it.\n\nIn most restaurants, food — especially beef, lamb and cheese — outweighs energy.",
    assume: "Life-cycle food emissions per kg (Poore & Nemecek 2018): beef 99.5, lamb 39.7, prawns 26.9, cheese 23.9, farmed fish 13.6, pork 12.3, poultry 9.9, eggs 4.7, rice 4.5, milk 3.2, grains 1.6, produce 0.5. Electricity 0.373 kg/kWh (US average), natural gas 5.3 kg/therm, a car ≈ 4.6 t CO₂ per year (EPA). Waste, refrigerants and travel are not included.",
    faq: [["What is the carbon footprint of a restaurant meal?", "Often 2–5 kg CO₂e per meal, mostly from the ingredients."], ["How can restaurants cut emissions fastest?", "Serving less beef and lamb and cutting food waste usually matter most."]],
  }),
  mk({
    slug: "meat-pricing-calculator", cat: FB, title: "Meat Pricing Calculator (Butcher & Retail Price per lb)",
    desc: "Set retail meat prices from what you paid — carcass, primal or subprimal cost, cutting yield, processing and packaging — and your target margin, with cost per sellable pound and profit.",
    meta: "Meat Pricing Calculator — Price per Pound From Yield & Margin",
    inputs: [dropdown("weightUnit", "Weight Unit", opts(["Pounds", "Kilograms"]), 0), num("weight", "Weight Bought (hanging / primal)", 600, 1000000, 1), cur("costPerLb", "Cost per lb Bought", 4.25, 1000, 0.01), pct("yieldPercent", "Sellable Yield After Cutting & Trim", 65, 100, 0.5), cur("processingCost", "Processing / Cutting Cost", 450, 1000000), cur("otherCosts", "Packaging, Labels & Other", 120, 1000000), pct("targetMargin", "Target Gross Margin", 30, 90, 0.5)],
    results: [["pricePerLb", "Average Selling Price per lb", "c"], ["costPerSellableLb", "Cost per Sellable lb", "c"], ["sellableLb", "Sellable Meat (lb)", "n"], ["totalCost", "Total Cost", "c"], ["revenue", "Revenue at That Price", "c"], ["profit", "Gross Profit", "c"], ["markupPercent", "Markup on Cost (%)", "n"]],
    fn: E.meatPricing, ex: { weightUnit: 0, weight: 600, costPerLb: 4.25, yieldPercent: 65, processingCost: 450, otherCosts: 120, targetMargin: 30 },
    exText: (o) => `Example: a 600 lb hanging beef side at $4.25/lb with 65% yield costs ${usd(o.costPerSellableLb)} per sellable pound, so a 30% margin needs an average price of ${usd(o.pricePerLb)}/lb.`,
    how: "Enter what you bought and your expected cutting yield — beef carcasses typically yield 60–70% retail cuts, pork 70–75%, lamb about 70%. The price is an average across all cuts: set steaks above it and ground meat below.",
    assume: "Cost per sellable lb = (weight × cost + processing + other) ÷ (weight × yield). Price = cost ÷ (1 − margin). Margin is on selling price; markup is on cost.",
    faq: [["What is the yield on a side of beef?", "About 60–70% of hanging weight becomes retail cuts."], ["What margin do butchers make?", "Often 25–40% gross margin across the whole carcass."]],
  }),
  mk({
    slug: "chick-fil-a-points-calculator", cat: FB, title: "Chick-fil-A Points Calculator (Chick-fil-A One Rewards)",
    desc: "See how many Chick-fil-A One points you earn by tier — Member, Silver, Red or Signature — how long until your next free reward, which tier your yearly spending earns, and what each point is worth.",
    meta: "Chick-fil-A Points Calculator — Chick-fil-A One Rewards Value",
    inputs: [cur("monthlySpend", "Spending at Chick-fil-A per Month", 60, 5000), dropdown("tier", "Your Current Tier", opts(E.CFA_TIERS.map(([n, r]) => `${n} (${r} pts per $1)`)), 0), num("currentPoints", "Points You Have Now", 0, 1000000, 1), num("rewardPoints", "Points Needed for Your Reward", 1000, 100000, 10), cur("rewardValue", "Menu Price of That Reward", 6, 100)],
    results: [["monthsToReward", "Months Until Your Reward", "n"], ["pointsPerMonth", "Points per Month", "n"], ["pointsPerYear", "Points per Year", "n"], ["tierYouWouldEarn", "Tier Your Yearly Points Earn (0 Member · 1 Silver · 2 Red · 3 Signature)", "n"], ["centsPerPoint", "Value per Point (cents)", "n"], ["effectiveCashbackPercent", "Effective Cash Back (%)", "n"], ["rewardsPerYear", "Rewards per Year", "n"]],
    fn: E.chickFilAPoints, ex: { monthlySpend: 60, tier: 0, currentPoints: 0, rewardPoints: 1000, rewardValue: 6 },
    exText: (o) => `Example: spending $60 a month as a Member earns ${o.pointsPerMonth} points, enough for a 1,000-point sandwich every ${o.monthsToReward} months — about ${o.effectiveCashbackPercent}% back.`,
    how: "Enter what you usually spend and the reward you want (check the app for its current point cost). Tier status is based on points earned in a calendar year and must be re-earned each year; points themselves do not expire while your account is active.",
    assume: "Earn rates: Member 10, Silver 11, Red 12, Signature 13 points per $1. Tier thresholds: Silver 1,000, Red 4,000, Signature 10,000 points in a year. Reward costs change — recent examples: ice cream ~200 points, sandwiches from ~1,000, entrées ~1,600.",
    faq: [["How many points do you get per dollar at Chick-fil-A?", "10 points per $1 as a Member, up to 13 as Signature."], ["How do you reach Red status at Chick-fil-A?", "Earn 4,000 points in a calendar year — about $400 of spending as a Member."]],
  }),
  mk({
    slug: "fast-food-price-calculator", cat: FB, title: "Fast Food Price Calculator (Order & Delivery Cost)",
    desc: "Add up any fast-food order — combos, burgers, chicken, sides, kids meals and drinks — and see the true cost with tax, or ordered through a delivery app with markup, fees and tip.",
    meta: "Fast Food Price Calculator — Order Total & Delivery App Cost",
    inputs: [...MENU_INPUTS(E.MENUS.fastfood, [2, 0, 0, 0, 2, 0]), ...ORDER_EXTRAS.map((f) => (f.key === "appMarkup" ? { ...f, default: 20 } : f.key === "deliveryFee" ? { ...f, default: 3.99 } : f.key === "serviceFeePercent" ? { ...f, default: 15 } : f.key === "tipPercent" ? { ...f, default: 15 } : f.key === "people" ? { ...f, default: 4 } : f))], results: ORDER_RESULTS,
    fn: E.fastFoodPrice, ex: { ...exOrder(E.MENUS.fastfood, [2, 0, 0, 0, 2, 0]), people: 4, appMarkup: 20, deliveryFee: 3.99, serviceFeePercent: 15, tipPercent: 15 },
    exText: (o) => `Example: two combo meals and two kids meals delivered through an app come to ${usd(o.orderTotal)} — ${usd(o.deliveryExtras)} of that is markup, fees and tip.`,
    how: ORDER_HOW + "\n\nSet the markup, fees and tip to 0 to see the in-store price.",
    assume: "Default prices are typical 2026 US fast-food prices (combo $10.99, sandwich $6.49, nuggets $6.99, side $3.49, kids meal $5.49, drink $2.29). Delivery defaults: 20% menu markup, $3.99 delivery fee, 15% service fee and 15% tip, calculated on the marked-up subtotal.",
    faq: [["How much more expensive is fast food on delivery apps?", "Often 40–80% more than in store once markup, fees and tip are added."], ["What is the average price of a fast-food meal in 2026?", "Around $10–13 for a combo in most of the US."]],
  }),
];

async function main() {
  const cats = new Map<string, string>();
  for (const slug of new Set(TOOLS.map((t) => t.cat))) {
    const cat = await prisma.toolCategory.findUnique({ where: { slug } });
    if (!cat) throw new Error(`The "${slug}" category doesn't exist — run "npx tsx prisma/setup-food-drink-category.ts --apply" first.`);
    cats.set(slug, cat.id);
  }

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: (await trvMovedCategoryId(prisma, def.slug)) ?? cats.get(def.cat)!,
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
      // Published straight away (user, 6 Nov 2026: no tool should stay Draft).
      await prisma.tool.create({
        data: { slug: def.slug, status: "published", ...toolContent, seoMeta: { create: seoMetaContent } },
      });
      created++;
    }
  }

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, all published.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
