// One-time (but safe to re-run) batch setup script: creates 15 party and holiday tools
// from the user's shopping list (Shopping Calculators > Lifestyle, Party & Wedding Calculators).
// See src/lib/calc-engine-shopping-life-party.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-life-party-calculators.ts
// or
//   npm run db:create-shopping-life-party-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Lifestyle, Party & Wedding Calculators", slug: "lifestyle-party-wedding-calculators" };

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

const YN = (key: string, label: string, def: number) => dropdown(key, label, [["No", 0], ["Yes", 1]], def);
const GUESTS = (def: number) => numberField("guests", "Number of Guests", { default: def, max: 2000 });
const HOURS = (def: number) => numberField("hours", "Party Length", { unit: "hours", default: def, max: 24, step: 0.5 });

const TOOLS: ToolDef[] = [
  {
    slug: "catering-cost-calculator",
    title: "Catering Cost Calculator",
    description: "Estimate catering cost for a party, wedding or corporate event by guests and service style — drop-off, buffet, family style, plated or stations — with staff, service charge, tax and tip.",
    metaTitle: "Catering Cost Calculator — Per Person Pricing",
    metaDescription: "Free catering cost calculator. Estimate event catering by guests and service style with staff, service charge, tax and gratuity.",
    calcInputs: [
      GUESTS(100),
      dropdown("style", "Service Style", [["Drop-off buffet ($25/person)", 0], ["Staffed buffet ($45)", 1], ["Family style ($60)", 2], ["Plated dinner ($75)", 3], ["Food stations ($70)", 4]], 1),
      numberField("hours", "Staff Hours (Including Setup)", { unit: "hours", default: 6, max: 24, step: 0.5 }),
      currencyField("staffRate", "Staff Rate per Hour", { default: 35, max: 150 }),
      percentField("serviceCharge", "Service Charge", { default: 18, max: 30, required: false }),
      percentField("taxRate", "Sales Tax on Food", { default: 7, max: 15, required: false }),
      percentField("gratuity", "Gratuity / Tip", { default: 0, max: 25, required: false }),
      percentField("regionFactor", "Regional Price Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Catering Cost", format: "currency", highlight: true },
      { key: "foodCost", label: "Food", format: "currency" },
      { key: "staffCost", label: "Servers & Staff", format: "currency" },
      { key: "serversNeeded", label: "Servers Needed", format: "number" },
      { key: "feesTaxTip", label: "Service Charge, Tax & Tip", format: "currency" },
      { key: "costPerPerson", label: "All-In Cost per Person", format: "currency" },
    ],
    instructions: "Enter the guest count and service style, how long staff will be on site, their hourly rate and the caterer's service charge, local tax and any tip. A service charge is often not a tip — ask how it's used.",
    examples: "Example: a staffed buffet for 100 guests with 4 servers for 6 hours costs about $6,616.20 — $66.16 per person all in.",
    assumptions: "Typical 2026 US per-person food prices by style; drinks, rentals, cake and bar service are extra. Staffing: about 1 server per 25 guests for buffets, 15 for family style and stations and 12 for plated dinners. Service charges of 18–22% are common.",
    faq: [
      { question: "How much does catering cost per person?", answer: "Roughly $25–$45 for buffets and $60–$100+ for plated or family-style dinners before service charges and tax." },
      { question: "How many servers do I need for an event?", answer: "About one per 20–25 guests for a buffet and one per 10–12 guests for a plated dinner." },
    ],
  },
  {
    slug: "party-drinks-calculator",
    title: "Party Drinks Calculator",
    description: "Figure out how many drinks to buy for a party — beer, wine, liquor, soda, water and cups — from guests, party length and your crowd's drink mix.",
    metaTitle: "Party Drinks Calculator — How Much to Buy",
    metaDescription: "Free party drinks calculator. Find how much beer, wine, liquor, soda, water and cups to buy for your guests and party length.",
    calcInputs: [
      GUESTS(40),
      HOURS(4),
      percentField("drinkersPercent", "Guests Who Drink Alcohol", { default: 70, max: 100 }),
      dropdown("mix", "Crowd's Drink Mix", [["Mostly beer (60/30/10)", 0], ["Balanced (40/40/20)", 1], ["Cocktail crowd (20/30/50)", 2]], 1),
    ],
    calcResult: { label: "Alcoholic Drinks", format: "number" },
    calcResults: [
      { key: "alcoholicDrinks", label: "Total Alcoholic Drinks", format: "number", highlight: true },
      { key: "beerCans", label: "Beer (12 oz Cans/Bottles)", format: "number" },
      { key: "wineBottles", label: "Wine Bottles (750 ml)", format: "number" },
      { key: "liquorBottles", label: "Liquor Bottles (750 ml)", format: "number" },
      { key: "sodaTwoLiters", label: "Soda / Mixers (2-Liter Bottles)", format: "number" },
      { key: "waterBottles", label: "Bottles of Water", format: "number" },
      { key: "cups", label: "Cups", format: "number" },
    ],
    instructions: "Enter your guest count, party length, how many drink alcohol and the mix your crowd prefers (beer / wine / liquor percentages).",
    examples: "Example: 40 guests at a 4-hour party with 70% drinking need about 140 drinks — 56 beers, 12 bottles of wine and 2 bottles of liquor — plus 22 two-liters of soda.",
    assumptions: "Drinkers have 2 drinks in the first hour and 1 per hour after. A wine bottle pours 5 glasses and a 750 ml liquor bottle about 16 drinks. Soda and mixers assume about 0.6 twelve-ounce servings per guest per hour; plan 3 cups per guest. Buy a little extra — leftovers keep.",
    faq: [
      { question: "How many drinks per person at a party?", answer: "Plan about 2 drinks per guest for the first hour and 1 per hour after that." },
      { question: "How much soda do I need for a party?", answer: "Roughly one 2-liter bottle for every 4–6 guests for a few hours, more if it's used as a mixer." },
    ],
  },
  {
    slug: "party-ice-calculator",
    title: "Party Ice Calculator",
    description: "Find how much ice to buy for a party — for drinks, chilling cans and bottles in coolers, and hot weather — in pounds and 10 or 20 lb bags.",
    metaTitle: "Party Ice Calculator — How Much Ice to Buy",
    metaDescription: "Free party ice calculator. Find how many pounds and bags of ice to buy for drinks and coolers by guests, hours and weather.",
    calcInputs: [
      GUESTS(50),
      HOURS(4),
      dropdown("use", "Ice Use", [["Drinks only (1 lb per guest)", 1], ["Drinks + chilling (2 lb per guest)", 2]], 2),
      dropdown("weather", "Weather", [["Indoors / mild", 1], ["Hot outdoor party", 1.5]], 1),
      numberField("coolers", "Extra Coolers to Fill (10 lb Each)", { default: 0, max: 50, required: false }),
      currencyField("bagPrice", "Price per 10 lb Bag", { default: 3.5, max: 20, step: 0.25 }),
    ],
    calcResult: { label: "Ice Needed", format: "number" },
    calcResults: [
      { key: "iceLb", label: "Ice Needed (lb)", format: "number", highlight: true },
      { key: "tenLbBags", label: "10 lb Bags", format: "number" },
      { key: "twentyLbBags", label: "20 lb Bags", format: "number" },
      { key: "iceCost", label: "Ice Cost (10 lb Bags)", format: "currency" },
      { key: "lbPerGuest", label: "Pounds per Guest", format: "number" },
    ],
    instructions: "Enter guests and party length, choose whether ice is just for drinks or also for chilling, and the weather. Add any extra coolers you need to fill.",
    examples: "Example: 50 guests at a 4-hour party with ice for drinks and chilling need about 110 lb — 11 ten-pound bags, roughly $38.50.",
    assumptions: "Rule of thumb: 1 lb per guest for drinks, 2 lb with chilling; parties over 3 hours add 10% per extra hour; hot outdoor parties need about 50% more. Keep ice in a shaded, insulated cooler and add rock salt to chill drinks faster.",
    faq: [
      { question: "How much ice do I need per person?", answer: "About 1 lb per guest for drinks and 2 lb if you're also chilling cans and bottles." },
      { question: "How much ice to chill a case of beer?", answer: "About 10 lb of ice chills a 24-pack in a cooler in roughly 30–45 minutes (faster with ice water and salt)." },
    ],
  },
  {
    slug: "meat-per-person-calculator",
    title: "Meat Per Person Calculator",
    description: "Find how much meat to buy per person for a barbecue, party or dinner — boneless, bone-in, brisket, pork shoulder or ribs — with cooked yield and cost.",
    metaTitle: "Meat Per Person Calculator — How Much to Buy",
    metaDescription: "Free meat per person calculator. Find how much raw meat to buy for adults and kids by cut, appetite and sides, with cooked yield and cost.",
    calcInputs: [
      numberField("adults", "Adults", { default: 20, max: 1000 }),
      numberField("kids", "Kids", { default: 5, max: 500, required: false }),
      dropdown("meatType", "Meat (Raw lb per Adult)", [["Boneless cuts — chicken breast, steak, tenderloin (0.5)", 0.5], ["Bone-in chicken or chops (0.75)", 0.75], ["Pork shoulder / butt, raw (0.9)", 0.9], ["Brisket, raw untrimmed (1.0)", 1], ["Ribs (1.0)", 1]], 0.5),
      dropdown("appetite", "Appetite", [["Light", 0.8], ["Average", 1], ["Big eaters", 1.25]], 1),
      YN("otherMains", "Serving Other Main Dishes Too", 0),
      currencyField("pricePerLb", "Price per lb", { default: 6, max: 100, step: 0.25 }),
    ],
    calcResult: { label: "Raw Meat", format: "number" },
    calcResults: [
      { key: "rawMeatLb", label: "Raw Meat to Buy (lb)", format: "number", highlight: true },
      { key: "cookedYieldLb", label: "Expected Cooked Yield (lb)", format: "number" },
      { key: "meatCost", label: "Meat Cost", format: "currency" },
      { key: "cookedOzPerAdult", label: "Cooked Ounces per Adult", format: "number" },
    ],
    instructions: "Enter adults and kids (kids count as half), choose the meat, appetite level and whether there are other mains, and the price per pound.",
    examples: "Example: 20 adults and 5 kids eating boneless cuts need about 11.25 lb of raw meat — roughly $67.50.",
    assumptions: "Raw amounts per adult account for bone and cooking loss: boneless cuts lose about 25%, bone-in about 35% and big smoked cuts like brisket and pork shoulder about 45–50%. With several mains, plan 25% less of each.",
    faq: [
      { question: "How much meat per person for a BBQ?", answer: "About 1/2 lb of boneless meat or 3/4–1 lb of bone-in or untrimmed raw meat per adult." },
      { question: "How much brisket do I need per person?", answer: "Plan about 1 lb of raw untrimmed brisket per adult, which yields roughly 1/2 lb cooked." },
    ],
  },
  {
    slug: "charcuterie-board-calculator",
    title: "Charcuterie Board Calculator",
    description: "Plan a charcuterie board — how much meat, cheese, crackers and fruit per person for an appetizer or meal, the board size and the cost.",
    metaTitle: "Charcuterie Board Calculator — Per Person",
    metaDescription: "Free charcuterie board calculator. Find how much meat, cheese, crackers and fruit per person, board size and cost for your guests.",
    calcInputs: [
      GUESTS(12),
      dropdown("asMeal", "Serving As", [["Appetizer", 0], ["Main meal", 1]], 0),
      currencyField("meatPricePerLb", "Cured Meat per lb", { default: 20, max: 100, step: 0.5 }),
      currencyField("cheesePricePerLb", "Cheese per lb", { default: 15, max: 100, step: 0.5 }),
      currencyField("extrasPerGuest", "Crackers, Fruit, Nuts & Spreads per Guest", { default: 2.5, max: 30, step: 0.25 }),
    ],
    calcResult: { label: "Meat", format: "number" },
    calcResults: [
      { key: "meatLb", label: "Cured Meats (lb)", format: "number", highlight: true },
      { key: "cheeseLb", label: "Cheese (lb)", format: "number" },
      { key: "crackers", label: "Crackers / Bread Slices", format: "number" },
      { key: "fruitCups", label: "Fruit & Veggies (Cups)", format: "number" },
      { key: "boardLengthIn", label: "Board Length (in, 3:2 Board)", format: "number" },
      { key: "estimatedCost", label: "Estimated Cost", format: "currency" },
    ],
    instructions: "Enter guests and whether the board is an appetizer or the meal, plus prices for meat, cheese and extras.",
    examples: "Example: an appetizer board for 12 needs about 1.5 lb of meat, 1.5 lb of cheese and 60 crackers on a board about 24 in long — roughly $82.50.",
    assumptions: "Appetizer: about 2 oz meat, 2 oz cheese, 5 crackers and 1/4 cup fruit per guest; double it for a meal. Board size allows about 30 sq in per guest. Mix 3–5 cheeses (soft, firm, aged, blue) and 2–4 meats.",
    faq: [
      { question: "How much charcuterie per person?", answer: "About 2 oz each of meat and cheese per person as an appetizer, and 3–4 oz each as a meal." },
      { question: "How big should a charcuterie board be?", answer: "About 12 × 18 in for 6–8 people; use two boards or a table runner for big groups." },
    ],
  },
  {
    slug: "keg-calculator",
    title: "Keg Calculator",
    description: "Find how many kegs you need for a party — half barrel, quarter, sixth or mini — from guests, drinkers and hours, with cost per beer and deposits.",
    metaTitle: "Keg Calculator — How Many Kegs for a Party",
    metaDescription: "Free keg calculator. Find how many half, quarter, sixth or mini kegs you need for your party, with cost per beer and deposits.",
    calcInputs: [
      GUESTS(100),
      HOURS(4),
      percentField("drinkersPercent", "Guests Who Drink", { default: 75, max: 100 }),
      percentField("beerShare", "Share of Drinks That Are Beer", { default: 70, max: 100 }),
      dropdown("kegSize", "Keg Size", [["Half barrel (15.5 gal, ≈165 beers)", 0], ["Quarter / pony (7.75 gal, ≈82)", 1], ["Sixth barrel (5.16 gal, ≈55)", 2], ["Mini keg (5 L, ≈14)", 3]], 0),
      currencyField("kegPrice", "Price per Keg", { default: 160, max: 1000 }),
      currencyField("deposit", "Refundable Deposit per Keg", { default: 50, max: 500, required: false }),
    ],
    calcResult: { label: "Kegs Needed", format: "number" },
    calcResults: [
      { key: "kegsNeeded", label: "Kegs Needed", format: "number", highlight: true },
      { key: "beersNeeded", label: "12 oz Beers Needed", format: "number" },
      { key: "kegCost", label: "Keg Cost", format: "currency" },
      { key: "refundableDeposits", label: "Refundable Deposits", format: "currency" },
      { key: "costPerBeer", label: "Cost per Beer", format: "currency" },
    ],
    instructions: "Enter guests, hours, the share who drink and the share of drinks that will be beer (less if you also serve wine and cocktails), then the keg size and price from your store.",
    examples: "Example: 100 guests at a 4-hour party, 75% drinking and 70% choosing beer, need about 289 beers — 2 half-barrel kegs at about $1.11 per beer.",
    assumptions: "Drinkers have 2 drinks in the first hour and 1 per hour after; 10% is added for foam and spills. A half barrel holds about 165 twelve-ounce beers. Rent a tap and tub, keep the keg at 36–38°F and let it settle before tapping.",
    faq: [
      { question: "How many beers are in a keg?", answer: "About 165 twelve-ounce beers in a half barrel, 82 in a quarter and 55 in a sixth barrel." },
      { question: "Is a keg cheaper than cans?", answer: "Usually — a domestic half barrel often works out to under $1 per beer, compared with $1.25–$2 for cans." },
    ],
  },
  {
    slug: "helium-calculator",
    title: "Helium Calculator",
    description: "Find how much helium and how many tanks you need to fill party balloons — 9, 11, 16 or 36 inch latex or 18 inch foil — and balloons per tank.",
    metaTitle: "Helium Calculator — Tanks for Balloons",
    metaDescription: "Free helium calculator. Find how many helium tanks you need for 9, 11, 16 or 36 inch latex or foil balloons and balloons per tank.",
    calcInputs: [
      numberField("balloons", "Number of Balloons", { default: 50, max: 5000 }),
      dropdown("size", "Balloon Size", [["9 in latex", 0], ["11 in latex", 1], ["16 in latex", 2], ["18 in foil", 3], ["36 in latex", 4]], 1),
      dropdown("tank", "Tank", [["Disposable 8.9 cu ft", 0], ["Disposable jumbo 14.9 cu ft", 1], ["Rental 55 cu ft", 2], ["Rental 80 cu ft", 3], ["Rental 125 cu ft", 4], ["Rental 244 cu ft", 5]], 1),
      currencyField("tankPrice", "Price per Tank", { default: 70, max: 1000 }),
    ],
    calcResult: { label: "Tanks Needed", format: "number" },
    calcResults: [
      { key: "tanksNeeded", label: "Tanks Needed", format: "number", highlight: true },
      { key: "heliumCuFt", label: "Helium Needed (cu ft)", format: "number" },
      { key: "balloonsPerTank", label: "Balloons per Tank", format: "number" },
      { key: "tankCost", label: "Tank Cost", format: "currency" },
    ],
    instructions: "Enter how many balloons and their size, then pick a tank size. Disposable tanks are sold at party and big-box stores; larger tanks are rented from party or welding suppliers.",
    examples: "Example: 50 eleven-inch latex balloons need about 27.5 cu ft of helium — 2 jumbo disposable tanks, about $140.00.",
    assumptions: "Helium per balloon: 9 in ≈ 0.25 cu ft, 11 in ≈ 0.5, 16 in ≈ 1.2, 18 in foil ≈ 0.5 and 36 in ≈ 5 cu ft, plus 10% for overfilling and waste. Latex balloons float about 8–12 hours (much longer with Hi-Float); foil lasts days to weeks.",
    faq: [
      { question: "How many balloons does a helium tank fill?", answer: "A 14.9 cu ft disposable tank fills about 27 eleven-inch latex balloons, or about 50 nine-inch ones." },
      { question: "How long do helium balloons last?", answer: "About 8–12 hours for latex (up to a few days with Hi-Float treatment) and several days to weeks for foil." },
    ],
  },
  {
    slug: "balloon-garland-price-calculator",
    title: "Balloon Garland Price Calculator",
    description: "Price a balloon garland or arch — balloons needed, DIY material cost and what a professional decorator would charge by length and style — and how much DIY saves.",
    metaTitle: "Balloon Garland Price Calculator — DIY vs Pro",
    metaDescription: "Free balloon garland price calculator. Find balloons needed, DIY cost and professional pricing per foot for garlands and arches.",
    calcInputs: [
      numberField("lengthFt", "Garland Length", { unit: "ft", default: 12, max: 500, step: 1 }),
      dropdown("density", "Fullness (Balloons per Foot)", [["Light (10)", 10], ["Standard organic (15)", 15], ["Extra full (20)", 20]], 15),
      dropdown("style", "Professional Style (Price per Foot)", [["Basic ($25/ft)", 25], ["Organic multi-size ($35/ft)", 35], ["Luxe with foils / florals ($50/ft)", 50]], 35),
      currencyField("installFee", "Pro Delivery & Install Fee", { default: 75, max: 1000, required: false }),
      currencyField("balloonPrice", "DIY Price per Balloon", { default: 0.2, max: 5, step: 0.05 }),
    ],
    calcResult: { label: "Pro Price", format: "currency" },
    calcResults: [
      { key: "proPrice", label: "Professional Price", format: "currency", highlight: true },
      { key: "balloonsNeeded", label: "Balloons Needed", format: "number" },
      { key: "diyMaterialCost", label: "DIY Material Cost", format: "currency" },
      { key: "diySavings", label: "DIY Savings", format: "currency" },
      { key: "proPricePerFoot", label: "Pro Price per Foot (All-In)", format: "currency" },
    ],
    instructions: "Enter the garland length (an arch over a doorway is usually 12–16 ft), fullness and professional style, plus delivery and DIY balloon prices.",
    examples: "Example: a 12 ft organic garland uses about 180 balloons; a pro would charge about $495.00, while DIY materials cost about $57.00.",
    assumptions: "Typical 2026 decorator pricing: $25–$50+ per foot plus delivery and installation. DIY includes balloons, decorating strip, glue dots and fishing line; a balloon pump is recommended. Air-filled garlands last several days indoors.",
    faq: [
      { question: "How much does a balloon garland cost?", answer: "Professional garlands commonly cost $25–$50 per foot, so a 12 ft garland runs about $300–$600 installed." },
      { question: "How many balloons are in a balloon garland?", answer: "About 12–20 mixed-size balloons per foot for a full, organic look." },
    ],
  },
  {
    slug: "cake-size-calculator",
    title: "Cake Size Calculator",
    description: "Find the cake size you need for your guest count — round, square or sheet cake — with party or wedding-size slices, cakes needed and extra servings.",
    metaTitle: "Cake Size Calculator — Servings by Pan Size",
    metaDescription: "Free cake size calculator. Find the round, square or sheet cake size for your servings, with party or wedding slices and cakes needed.",
    calcInputs: [
      numberField("servings", "Servings Needed", { default: 30, max: 2000 }),
      dropdown("shape", "Cake Shape", [["Round (2 layers)", 0], ["Square (2 layers)", 1], ["Sheet cake (1 layer, longest side)", 2]], 0),
      dropdown("weddingSlices", "Slice Size", [["Party slice (1.5 × 2 in)", 0], ["Wedding slice (1 × 2 in)", 1]], 0),
    ],
    calcResult: { label: "Recommended Size", format: "number" },
    calcResults: [
      { key: "recommendedSizeIn", label: "Recommended Size (in — Diameter, Side or Sheet Length)", format: "number", highlight: true },
      { key: "cakesNeeded", label: "Cakes Needed", format: "number" },
      { key: "servingsProvided", label: "Servings Provided", format: "number" },
      { key: "extraServings", label: "Extra Servings", format: "number" },
    ],
    instructions: "Enter how many slices you need, the shape and slice size. Sheet sizes: 13 in = quarter sheet (9 × 13), 18 in = half sheet (12 × 18), 24 in = full sheet (18 × 24).",
    examples: "Example: 30 party servings call for a 12 in round 2-layer cake, which serves about 40.",
    assumptions: "Party servings (2-layer rounds): 6 in ≈ 12, 8 in ≈ 20, 9 in ≈ 24, 10 in ≈ 28, 12 in ≈ 40, 14 in ≈ 63; squares serve about 50% more; single-layer sheets ≈ 24 / 54 / 96. Wedding slices are thinner, giving about 1.6× as many servings.",
    faq: [
      { question: "What size cake feeds 20 people?", answer: "An 8 in round 2-layer cake or a 9 × 13 sheet cake feeds about 20 with party-size slices." },
      { question: "How many people does a half sheet cake feed?", answer: "About 40–54 with party slices and up to about 80 with small wedding-style slices." },
    ],
  },
  {
    slug: "crinkle-paper-calculator",
    title: "Crinkle Paper Calculator",
    description: "Work out how much crinkle-cut shred paper you need to fill gift boxes, baskets and hampers — ounces, 2 oz bags or 1 lb bulk boxes — and the cheapest way to buy it.",
    metaTitle: "Crinkle Paper Calculator — Filler for Gift Boxes",
    metaDescription: "Free crinkle paper calculator. Find how much shred filler you need for gift boxes and baskets, in bags or bulk, and the cheapest buy.",
    calcInputs: [
      numberField("containers", "Boxes or Baskets to Fill", { default: 25, max: 10000 }),
      dropdown("size", "Container Size (Filler per Box)", [["Small gift box, 6 × 6 in (0.5 oz)", 0.5], ["Medium box / small basket (1 oz)", 1], ["Large basket (2 oz)", 2], ["Hamper / XL crate (4 oz)", 4]], 1),
      dropdown("fill", "Fill Level", [["Light bed", 0.7], ["Full", 1], ["Overflowing", 1.4]], 1),
      currencyField("bagPrice", "Price per 2 oz Bag", { default: 3, max: 20, step: 0.25 }),
      currencyField("bulkPrice", "Price per 1 lb Box", { default: 14, max: 100, step: 0.5 }),
    ],
    calcResult: { label: "Ounces Needed", format: "number" },
    calcResults: [
      { key: "ozNeeded", label: "Crinkle Paper Needed (oz)", format: "number", highlight: true },
      { key: "twoOzBags", label: "2 oz Bags", format: "number" },
      { key: "onePoundBoxes", label: "1 lb Bulk Boxes", format: "number" },
      { key: "cheapestCost", label: "Cheapest Cost", format: "currency" },
      { key: "lbNeeded", label: "Pounds Needed", format: "number" },
    ],
    instructions: "Enter how many boxes or baskets you're filling, their size and how full you want them, and prices for small bags and bulk boxes.",
    examples: "Example: 25 medium boxes filled full need about 25 oz of crinkle paper — 2 one-pound boxes or 13 small bags; the cheapest option costs about $28.00.",
    assumptions: "Typical fill amounts for crinkle-cut kraft or colored paper shred. A pound of crinkle paper fills about 15–20 medium gift boxes. Fluff it by hand before filling; bulk boxes are usually far cheaper per ounce for business orders.",
    faq: [
      { question: "How much crinkle paper do I need for a gift box?", answer: "About 0.5 oz for a small box, 1 oz for a medium box or basket and 2–4 oz for large baskets and hampers." },
      { question: "How many boxes does a pound of crinkle paper fill?", answer: "Roughly 15–20 medium boxes, or 30+ small ones." },
    ],
  },
  {
    slug: "halloween-candy-calculator",
    title: "Halloween Candy Calculator",
    description: "Work out how much Halloween candy to buy — pieces and bags — from expected trick-or-treaters, pieces per kid and a buffer, with total cost and cost per kid.",
    metaTitle: "Halloween Candy Calculator — How Much to Buy",
    metaDescription: "Free Halloween candy calculator. Find how many candy pieces and bags to buy for trick-or-treaters, with total cost and cost per kid.",
    calcInputs: [
      numberField("trickOrTreaters", "Expected Trick-or-Treaters", { default: 75, max: 5000 }),
      numberField("piecesPerKid", "Pieces per Kid", { default: 2, min: 1, max: 10 }),
      percentField("buffer", "Extra Buffer", { default: 15, max: 100, required: false }),
      numberField("piecesPerBag", "Pieces per Bag", { default: 40, min: 1, max: 500 }),
      currencyField("bagPrice", "Price per Bag", { default: 10, max: 100, step: 0.25 }),
    ],
    calcResult: { label: "Bags to Buy", format: "number" },
    calcResults: [
      { key: "bagsToBuy", label: "Bags to Buy", format: "number", highlight: true },
      { key: "candyPieces", label: "Candy Pieces Needed", format: "number" },
      { key: "candyCost", label: "Candy Cost", format: "currency" },
      { key: "costPerKid", label: "Cost per Trick-or-Treater", format: "currency" },
    ],
    instructions: "Estimate trick-or-treaters (last year's count is best; quiet streets get 20–50, busy neighborhoods 100–300+), how many pieces each child gets and a buffer, then the bag size and price.",
    examples: "Example: 75 trick-or-treaters at 2 pieces each with a 15% buffer need 173 pieces — 5 bags of 40, about $50.00.",
    assumptions: "Most households give 1–3 pieces per child. Weather, the day of the week and your porch decorations change turnout a lot. Buying chocolate early risks eating it — or buy candy you don't love.",
    faq: [
      { question: "How much Halloween candy should I buy?", answer: "Plan about 2 pieces per expected trick-or-treater plus 10–20% extra; 100 kids need roughly 220–240 pieces." },
      { question: "How many trick-or-treaters will I get?", answer: "Anywhere from a few to several hundred; suburban neighborhoods with sidewalks often see 50–150." },
    ],
  },
  {
    slug: "christmas-lights-calculator",
    title: "Christmas Lights Calculator",
    description: "Find how many Christmas lights and strands you need for your tree, roofline and shrubs — and what they'll cost to run all season with LED or incandescent bulbs.",
    metaTitle: "Christmas Lights Calculator — Lights & Cost",
    metaDescription: "Free Christmas lights calculator. Find how many lights and strands you need for tree, roofline and shrubs and the season's electricity cost.",
    calcInputs: [
      numberField("treeHeightFt", "Tree Height", { unit: "ft", default: 7, max: 50, step: 0.5 }),
      dropdown("density", "Tree Look (Lights per Foot)", [["Subtle (50)", 50], ["Classic (100)", 100], ["Bright (150+)", 150]], 100),
      numberField("rooflineFt", "Roofline / Gutter Length", { unit: "ft", default: 60, max: 1000, required: false }),
      numberField("shrubs", "Shrubs (100 Lights Each)", { default: 4, max: 100, required: false }),
      dropdown("bulbType", "Bulbs", [["LED mini (≈0.07 W each)", 0.07], ["Incandescent mini (≈0.4 W each)", 0.4]], 0.07),
      numberField("hoursPerDay", "Hours On per Day", { default: 6, max: 24, step: 0.5 }),
      numberField("days", "Days Displayed", { default: 35, max: 120 }),
      currencyField("rate", "Electricity Rate per kWh", { default: 0.17, max: 1, step: 0.01 }),
    ],
    calcResult: { label: "Total Lights", format: "number" },
    calcResults: [
      { key: "totalLights", label: "Total Lights", format: "number", highlight: true },
      { key: "strandsOf100", label: "100-Light Strands", format: "number" },
      { key: "treeLights", label: "Lights for the Tree", format: "number" },
      { key: "wattage", label: "Total Wattage (W)", format: "number" },
      { key: "seasonElectricityCost", label: "Electricity Cost for the Season", format: "currency" },
    ],
    instructions: "Enter your tree height and look, roofline length and shrubs, then the bulb type, how many hours a day they're on, days displayed and your electricity rate.",
    examples: "Example: a 7 ft tree at 100 lights per foot, 60 ft of roofline and 4 shrubs need 1,340 lights (14 strands); LEDs on 6 hours a day for 35 days cost about $3.35.",
    assumptions: "Tree rule of thumb: about 100 mini lights per vertical foot for a classic look. Rooflines use about 4 bulbs per foot and shrubs about 100 lights each. LED minis use roughly 80–90% less power than incandescent and last much longer. Check how many strands can safely connect end to end.",
    faq: [
      { question: "How many lights do I need for a 7 ft Christmas tree?", answer: "About 700 mini lights for a classic look, or 1,000+ for a bright, full tree." },
      { question: "How much does it cost to run Christmas lights?", answer: "LED displays often cost just a few dollars for the whole season; large incandescent displays can cost $30–$100+." },
    ],
  },
  {
    slug: "christmas-ornament-calculator",
    title: "Christmas Ornament Calculator",
    description: "Find how many ornaments, how much garland and ribbon, and what size tree topper you need for your Christmas tree — with the ornament cost.",
    metaTitle: "Christmas Ornament Calculator — Tree Decorating",
    metaDescription: "Free Christmas ornament calculator. Find how many ornaments, feet of garland and ribbon and topper size you need for your tree.",
    calcInputs: [
      numberField("treeHeightFt", "Tree Height", { unit: "ft", default: 7, max: 50, step: 0.5 }),
      dropdown("density", "Look (Ornaments per Foot)", [["Minimal (10)", 10], ["Classic (15)", 15], ["Full / designer (20+)", 20]], 15),
      currencyField("avgPrice", "Average Price per Ornament", { default: 1.5, max: 100, step: 0.25 }),
    ],
    calcResult: { label: "Ornaments", format: "number" },
    calcResults: [
      { key: "ornaments", label: "Ornaments", format: "number", highlight: true },
      { key: "garlandFt", label: "Garland (ft)", format: "number" },
      { key: "ribbonFt", label: "Ribbon (ft)", format: "number" },
      { key: "topperSizeIn", label: "Tree Topper Size (in)", format: "number" },
      { key: "ornamentCost", label: "Ornament Cost", format: "currency" },
    ],
    instructions: "Enter the tree height, choose how full you want it and the average price per ornament (shatterproof sets cost less per piece than glass or specialty ornaments).",
    examples: "Example: a 7 ft tree decorated in a classic style needs about 105 ornaments, 19 ft of garland and 63 ft of ribbon, with a topper about 10.5 in tall.",
    assumptions: "Rule of thumb: 10–20 ornaments per vertical foot, garland about 2.7 ft per foot of height and ribbon about 9 ft per foot for draped or cascading styles. Mix sizes: larger ornaments deep inside the branches and smaller ones near the tips.",
    faq: [
      { question: "How many ornaments do I need for a 7 ft tree?", answer: "About 70–140 ornaments, with around 100 for a classic, well-filled look." },
      { question: "How much garland for a Christmas tree?", answer: "About 2–3 ft of garland per foot of tree height, more for tight wraps." },
    ],
  },
  {
    slug: "thanksgiving-food-calculator",
    title: "Thanksgiving Food Calculator",
    description: "Plan Thanksgiving dinner quantities — turkey, mashed potatoes, stuffing, gravy, cranberry sauce, rolls and pies — for your adults and kids, with or without leftovers.",
    metaTitle: "Thanksgiving Food Calculator — How Much Food",
    metaDescription: "Free Thanksgiving food calculator. Find how much turkey, potatoes, stuffing, gravy, cranberry, rolls and pies to make for your guests.",
    calcInputs: [
      numberField("adults", "Adults", { default: 10, max: 200 }),
      numberField("kids", "Kids", { default: 2, max: 100, required: false }),
      YN("leftovers", "Want Leftovers", 1),
    ],
    calcResult: { label: "Turkey", format: "number" },
    calcResults: [
      { key: "turkeyLb", label: "Whole Turkey (lb)", format: "number", highlight: true },
      { key: "mashedPotatoesLb", label: "Potatoes for Mashing (lb)", format: "number" },
      { key: "stuffingCups", label: "Stuffing (Cups, Prepared)", format: "number" },
      { key: "gravyCups", label: "Gravy (Cups)", format: "number" },
      { key: "cranberryCups", label: "Cranberry Sauce (Cups)", format: "number" },
      { key: "dinnerRolls", label: "Dinner Rolls", format: "number" },
      { key: "pies", label: "Pies (8 Slices Each)", format: "number" },
    ],
    instructions: "Enter the number of adults and kids and whether you want leftovers. Kids count as half portions for most dishes.",
    examples: "Example: 10 adults and 2 kids with leftovers need about a 19.25 lb turkey, 7.7 lb of potatoes, 11.55 cups of stuffing and 2 pies.",
    assumptions: "Per adult: about 1.25 lb whole turkey, 1/2 lb potatoes, 3/4 cup stuffing, 1/3 cup gravy, 1/4 cup cranberry sauce and 1.5 rolls; one pie per 8 people. Leftovers add about 40%. Add vegetables and appetizers to taste.",
    faq: [
      { question: "How much turkey per person for Thanksgiving?", answer: "About 1–1.5 lb of whole turkey per person, or 1.5–2 lb if you want plenty of leftovers." },
      { question: "How many pies do I need for Thanksgiving?", answer: "About one pie for every 8 guests, plus an extra if you want leftovers or several flavors." },
    ],
  },
  {
    slug: "turkey-size-calculator",
    title: "Turkey Size Calculator",
    description: "Find what size turkey to buy for your guests — whole bird or breast — with refrigerator thawing time, roasting time and cost.",
    metaTitle: "Turkey Size Calculator — Size, Thaw & Roast Time",
    metaDescription: "Free turkey size calculator. Find the turkey size for your guests with leftovers, fridge thawing days, roasting time and cost.",
    calcInputs: [
      numberField("adults", "Adults", { default: 12, max: 200 }),
      numberField("kids", "Kids", { default: 0, max: 100, required: false }),
      dropdown("leftovers", "Leftovers", [["None (1 lb per person)", 1], ["Some (1.5 lb)", 1.5], ["Lots (2 lb)", 2]], 1.5),
      dropdown("turkeyType", "Turkey Type", [["Whole turkey", 0], ["Bone-in turkey breast", 1]], 0),
      currencyField("pricePerLb", "Price per lb", { default: 1.9, max: 20, step: 0.05 }),
    ],
    calcResult: { label: "Turkey Size", format: "number" },
    calcResults: [
      { key: "turkeyLb", label: "Turkey Size (lb)", format: "number", highlight: true },
      { key: "fridgeThawDays", label: "Days to Thaw in the Fridge", format: "number" },
      { key: "roastHoursUnstuffed", label: "Roasting Time at 325°F, Unstuffed (Hours)", format: "number" },
      { key: "turkeyCost", label: "Turkey Cost", format: "currency" },
    ],
    instructions: "Enter adults and kids, how many leftovers you want and whether you're buying a whole bird or a breast, plus the price per pound.",
    examples: "Example: 12 adults with some leftovers need about an 18 lb turkey; thaw it in the fridge for 4 days and roast about 4.2 hours at 325°F.",
    assumptions: "Whole turkey: about 1 lb per person, 1.5 lb for some leftovers. Bone-in breast needs about 40% less. Thaw in the refrigerator about 1 day per 4–5 lb; roast unstuffed about 13–15 minutes per lb at 325°F until the thickest part of the thigh reaches 165°F.",
    faq: [
      { question: "What size turkey do I need for 12 people?", answer: "About 12–18 lb, depending on how many leftovers you want." },
      { question: "How long does a turkey take to thaw?", answer: "About 24 hours per 4–5 lb in the refrigerator, so a 16 lb bird needs about 4 days." },
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
