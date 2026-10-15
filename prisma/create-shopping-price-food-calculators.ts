// One-time (but safe to re-run) batch setup script: creates 11 food and drink pricing tools
// from the user's shopping list (Shopping Calculators > Pricing, Markup & Seller Fee Calculators).
// See src/lib/calc-engine-shopping-price-food.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-price-food-calculators.ts
// or
//   npm run db:create-shopping-price-food-calculators

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

const BAKER_NOTE = "Pay yourself for your time: underpricing labor is the most common mistake home bakers make. Check local cottage food laws before selling from home.";

const TOOLS: ToolDef[] = [
  {
    slug: "food-cost-calculator",
    title: "Food Cost Calculator",
    description: "Calculate your restaurant's food cost percentage for a week or month from opening inventory, purchases, closing inventory and food sales, and compare it with your target.",
    metaTitle: "Food Cost Calculator — Restaurant Food Cost %",
    metaDescription: "Free food cost calculator for restaurants. Find food cost percentage and cost of goods sold from inventory, purchases and food sales.",
    calcInputs: [
      currencyField("beginningInventory", "Opening Food Inventory", { default: 8200, max: 10000000, step: 10 }),
      currencyField("purchases", "Food Purchases in the Period", { default: 14600, max: 10000000, step: 10 }),
      currencyField("endingInventory", "Closing Food Inventory", { default: 7900, max: 10000000, step: 10 }),
      currencyField("foodSales", "Food Sales in the Period", { default: 48000, max: 100000000, step: 10 }),
      percentField("targetPercent", "Target Food Cost %", { default: 30, max: 60, step: 0.5 }),
    ],
    calcResult: { label: "Food Cost %", format: "percentage" },
    calcResults: [
      { key: "foodCostPercent", label: "Food Cost Percentage", format: "percentage", highlight: true },
      { key: "costOfGoodsSold", label: "Cost of Food Sold", format: "currency" },
      { key: "grossProfit", label: "Gross Profit on Food", format: "currency" },
      { key: "vsTarget", label: "Points Above (+) or Below (−) Target", format: "number" },
      { key: "overspendVsTarget", label: "Overspend vs Target", format: "currency" },
    ],
    instructions:
      "Count your food inventory at the start and end of the period, add up food purchases in between, and enter food sales (not drinks) for the same period.\n\n" +
      "Set your target food cost percentage to see how far you are from it.",
    examples: "Example: $8,200 opening inventory + $14,600 purchases − $7,900 closing inventory = $14,900.00 of food used. On $48,000 of food sales, food cost is 31.04% — $500.00 over a 30% target.",
    assumptions: "Food cost % = (opening inventory + purchases − closing inventory) ÷ food sales. Most full-service restaurants aim for 28–35%. Staff meals, comps and waste all count as food used, so high numbers often point to waste, theft or under-priced dishes.",
    faq: [
      { question: "What is a good food cost percentage?", answer: "Around 28% to 35% for most restaurants; fine dining and steakhouses run higher, pizza and cafés lower." },
      { question: "How do I lower my food cost?", answer: "Re-price low-margin dishes, control portions, cut waste, negotiate with suppliers and track inventory weekly." },
    ],
  },
  {
    slug: "menu-pricing-calculator",
    title: "Menu Pricing Calculator",
    description: "Set a menu price from one plate's ingredient cost and your target food cost percentage, rounded to a menu-friendly price, with the gross profit per plate.",
    metaTitle: "Menu Pricing Calculator — Price From Plate Cost",
    metaDescription: "Free menu pricing calculator. Turn plate cost into a menu price at your target food cost %, rounded to .99, .95 or whole dollars.",
    calcInputs: [
      currencyField("plateCost", "Ingredient Cost per Plate", { default: 4.85, max: 10000, step: 0.01 }),
      percentField("targetFoodCost", "Target Food Cost %", { default: 30, max: 80, step: 0.5 }),
      dropdown("rounding", "Round Price To", [["Ending in .99", 0], ["Ending in .95", 1], ["Whole dollars", 2]], 2),
    ],
    calcResult: { label: "Menu Price", format: "currency" },
    calcResults: [
      { key: "menuPrice", label: "Menu Price", format: "currency", highlight: true },
      { key: "exactPrice", label: "Exact Price at Target", format: "currency" },
      { key: "grossProfitPerPlate", label: "Gross Profit per Plate", format: "currency" },
      { key: "actualFoodCostPercent", label: "Food Cost % at Menu Price", format: "percentage" },
      { key: "markupMultiple", label: "Price ÷ Plate Cost", format: "number" },
    ],
    instructions:
      "Cost out one portion of the dish — every ingredient, garnish and side — and enter it with your target food cost percentage. Choose how to round the menu price.",
    examples: "Example: a dish with $4.85 of ingredients at a 30% food cost target works out to $16.17, so list it at $17.00. That leaves $12.15 of gross profit per plate at a 28.53% food cost.",
    assumptions: "Menu price = plate cost ÷ target food cost %. Rounding up keeps you at or below target. Consider competitors' prices and what the dish is worth to guests too — a popular dish with a higher food cost can still earn more dollars per plate.",
    faq: [
      { question: "How do restaurants price menu items?", answer: "Most start by dividing the plate cost by a target food cost percentage (often 28–35%), then adjust for competition and perceived value." },
      { question: "Is a 3× markup on food standard?", answer: "Roughly — a 33% food cost means the price is about three times the ingredient cost." },
    ],
  },
  {
    slug: "recipe-cost-calculator",
    title: "Recipe Cost Calculator",
    description: "Cost out a recipe from up to six ingredients using each package's price and size, then see the cost per serving and a selling price — for home cooks, bakers and restaurants.",
    metaTitle: "Recipe Cost Calculator — Cost per Serving",
    metaDescription: "Free recipe cost calculator. Price each ingredient from its package cost, then find the total recipe cost, cost per serving and a selling price.",
    calcInputs: [
      currencyField("price1", "Ingredient 1 — Package Price", { default: 4.99, max: 10000, step: 0.01 }),
      numberField("size1", "Ingredient 1 — Package Size", { default: 80, max: 100000, step: 0.1 }),
      numberField("used1", "Ingredient 1 — Amount Used (Same Unit)", { default: 16, max: 100000, step: 0.1 }),
      currencyField("price2", "Ingredient 2 — Package Price", { default: 3.49, max: 10000, step: 0.01, required: false }),
      numberField("size2", "Ingredient 2 — Package Size", { default: 32, max: 100000, step: 0.1, required: false }),
      numberField("used2", "Ingredient 2 — Amount Used", { default: 8, max: 100000, step: 0.1, required: false }),
      currencyField("price3", "Ingredient 3 — Package Price", { default: 5.99, max: 10000, step: 0.01, required: false }),
      numberField("size3", "Ingredient 3 — Package Size", { default: 16, max: 100000, step: 0.1, required: false }),
      numberField("used3", "Ingredient 3 — Amount Used", { default: 8, max: 100000, step: 0.1, required: false }),
      currencyField("price4", "Ingredient 4 — Package Price", { default: 3.29, max: 10000, step: 0.01, required: false }),
      numberField("size4", "Ingredient 4 — Package Size", { default: 12, max: 100000, step: 0.1, required: false }),
      numberField("used4", "Ingredient 4 — Amount Used", { default: 3, max: 100000, step: 0.1, required: false }),
      currencyField("price5", "Ingredient 5 — Package Price", { default: 0, max: 10000, step: 0.01, required: false }),
      numberField("size5", "Ingredient 5 — Package Size", { default: 0, max: 100000, step: 0.1, required: false }),
      numberField("used5", "Ingredient 5 — Amount Used", { default: 0, max: 100000, step: 0.1, required: false }),
      currencyField("price6", "Ingredient 6 — Package Price", { default: 0, max: 10000, step: 0.01, required: false }),
      numberField("size6", "Ingredient 6 — Package Size", { default: 0, max: 100000, step: 0.1, required: false }),
      numberField("used6", "Ingredient 6 — Amount Used", { default: 0, max: 100000, step: 0.1, required: false }),
      currencyField("extras", "Spices, Oil & Small Extras", { default: 0.75, max: 1000, step: 0.05, required: false }),
      numberField("servings", "Servings the Recipe Makes", { default: 8, min: 1, max: 10000 }),
      percentField("markupPercent", "Markup for Selling", { default: 200, max: 1000, step: 5, required: false }),
    ],
    calcResult: { label: "Cost per Serving", format: "currency" },
    calcResults: [
      { key: "costPerServing", label: "Cost per Serving", format: "currency", highlight: true },
      { key: "totalRecipeCost", label: "Total Recipe Cost", format: "currency" },
      { key: "priceAt30PercentFoodCost", label: "Price per Serving at 30% Food Cost", format: "currency" },
      { key: "priceWithMarkup", label: "Price per Serving With Your Markup", format: "currency" },
    ],
    instructions:
      "For each ingredient, enter what the package cost, its size, and how much the recipe uses in the same unit (ounces, grams, cups or items). Leave unused rows at 0.\n\n" +
      "Add a small amount for spices and oil, the number of servings, and a markup if you sell the dish.",
    examples: "Example: 16 oz of an 80 oz $4.99 bag of flour, a quarter of a $3.49 carton, half a $5.99 package and 3 of 12 items costing $3.29, plus $0.75 of extras, cost $6.44 — $0.80 a serving across 8 servings.",
    assumptions: "Ingredient cost = package price ÷ package size × amount used. Use the same unit for size and amount. Trim and cooking loss mean you may need more than the recipe's raw weight — add it to the amount used.",
    faq: [
      { question: "How do I calculate the cost per serving of a recipe?", answer: "Work out each ingredient's cost (package price ÷ package size × amount used), add them up and divide by the number of servings." },
      { question: "How should I price food I sell?", answer: "Restaurants usually aim for a food cost of 28–35% of the price; bakers often use ingredient cost plus labor, overhead and profit." },
    ],
  },
  {
    slug: "liquor-pricing-calculator",
    title: "Liquor Pricing Calculator",
    description: "Price a shot or pour of liquor from the bottle cost, bottle size and pour size at your target pour cost, and see pours, revenue and profit per bottle.",
    metaTitle: "Liquor Pricing Calculator — Price per Pour",
    metaDescription: "Free liquor pricing calculator. Find the price per shot or pour from bottle cost, size and pour cost %, plus pours and profit per bottle.",
    calcInputs: [
      currencyField("bottleCost", "Bottle Cost", { default: 24, max: 10000, step: 0.01 }),
      numberField("bottleMl", "Bottle Size", { unit: "ml", default: 750, max: 5000, step: 50 }),
      numberField("pourOz", "Pour Size", { unit: "oz", default: 1.5, max: 5, step: 0.25 }),
      percentField("pourCostTarget", "Target Pour Cost %", { default: 20, max: 60, step: 1 }),
      percentField("spillage", "Spillage & Over-Pour Allowance", { default: 5, max: 30, step: 1, required: false }),
    ],
    calcResult: { label: "Price per Drink", format: "currency" },
    calcResults: [
      { key: "pricePerDrink", label: "Price per Drink", format: "currency", highlight: true },
      { key: "costPerPour", label: "Cost per Pour", format: "currency" },
      { key: "poursPerBottle", label: "Pours per Bottle", format: "number" },
      { key: "revenuePerBottle", label: "Revenue per Bottle", format: "currency" },
      { key: "profitPerBottle", label: "Profit per Bottle", format: "currency" },
    ],
    instructions:
      "Enter what you pay for the bottle, its size and your standard pour, then your target pour cost — the share of the drink price that pays for the liquor.\n\n" +
      "Add an allowance for spillage and over-pouring.",
    examples: "Example: a $24, 750 ml bottle with 1.5 oz pours and 5% spillage gives 16.06 pours at $1.49 each. At a 20% pour cost, charge $7.47 a drink — $96.00 profit per bottle.",
    assumptions: "A 750 ml bottle holds 25.4 oz. Typical pour cost targets: 15–20% for liquor, 20–25% for cocktails, 25–30% for beer. Well, call and premium spirits are often priced in tiers rather than one by one.",
    faq: [
      { question: "What is pour cost?", answer: "The cost of the liquor in a drink as a percentage of its price. A $1.50 pour sold for $7.50 has a 20% pour cost." },
      { question: "How many shots are in a 750 ml bottle?", answer: "About 17 shots of 1.5 oz, or 25 shots of 1 oz." },
    ],
  },
  {
    slug: "beer-pricing-calculator",
    title: "Beer Pricing Calculator",
    description: "Price draft or bottled beer from the keg or case cost, serving size and target pour cost, and see servings, revenue and profit per keg or case.",
    metaTitle: "Beer Pricing Calculator — Price per Pint & Keg",
    metaDescription: "Free beer pricing calculator. Price a pint or bottle from keg or case cost and pour cost %, and see servings and profit per keg.",
    calcInputs: [
      dropdown("container", "Container", [["Half-barrel keg (15.5 gal)", 0], ["Quarter-barrel keg (7.75 gal)", 1], ["Sixth-barrel keg (5.16 gal)", 2], ["Case of 24 × 12 oz", 3], ["Case of 12 × 12 oz", 4]], 0),
      currencyField("containerCost", "Keg or Case Cost", { default: 160, max: 10000, step: 1 }),
      numberField("servingOz", "Serving Size", { unit: "oz", default: 16, max: 32, step: 1 }),
      percentField("pourCostTarget", "Target Pour Cost %", { default: 25, max: 60, step: 1 }),
      percentField("waste", "Foam & Waste Allowance", { default: 8, max: 30, step: 1, required: false }),
    ],
    calcResult: { label: "Price per Serving", format: "currency" },
    calcResults: [
      { key: "pricePerServing", label: "Price per Serving", format: "currency", highlight: true },
      { key: "costPerServing", label: "Cost per Serving", format: "currency" },
      { key: "servingsPerContainer", label: "Servings per Container", format: "number" },
      { key: "revenuePerContainer", label: "Revenue per Container", format: "currency" },
      { key: "profitPerContainer", label: "Profit per Container", format: "currency" },
    ],
    instructions:
      "Choose the keg or case size and enter what it costs you, your serving size and target pour cost. For bottles or cans, choose a case and a 12 oz serving and set waste to 0.",
    examples: "Example: a $160 half-barrel keg poured in 16 oz pints with 8% waste gives 114.08 pints at $1.40 each. At a 25% pour cost, charge $5.61 — $480.00 profit per keg.",
    assumptions: "A half-barrel keg holds 1,984 oz (about 124 pints before waste). Draft beer often has a lower pour cost than bottles, so bars typically target 20–25% on draft and 25–30% on packaged beer.",
    faq: [
      { question: "How many pints are in a keg?", answer: "A half-barrel keg holds about 124 pints of 16 oz; after foam and waste, plan on 110–115." },
      { question: "What is a good pour cost for beer?", answer: "About 20–25% for draft and 25–30% for bottles and cans." },
    ],
  },
  {
    slug: "wine-pricing-calculator",
    title: "Wine Pricing Calculator",
    description: "Price wine by the glass and by the bottle from your bottle cost — glass price at a target cost percentage and a bottle list price at your markup multiple.",
    metaTitle: "Wine Pricing Calculator — By the Glass & Bottle",
    metaDescription: "Free wine pricing calculator. Set by-the-glass and bottle list prices from bottle cost, pour size and markup, with profit per bottle.",
    calcInputs: [
      currencyField("bottleCost", "Bottle Cost (Wholesale)", { default: 14, max: 10000, step: 0.01 }),
      numberField("pourOz", "Glass Pour", { unit: "oz", default: 5, max: 10, step: 0.5 }),
      percentField("glassCostTarget", "Target Cost % by the Glass", { default: 25, max: 60, step: 1 }),
      numberField("bottleMultiple", "Bottle List Price Multiple", { default: 3, min: 1, max: 6, step: 0.1 }),
    ],
    calcResult: { label: "Price per Glass", format: "currency" },
    calcResults: [
      { key: "glassPrice", label: "Price per Glass", format: "currency", highlight: true },
      { key: "bottleListPrice", label: "Bottle List Price", format: "currency" },
      { key: "glassesPerBottle", label: "Glasses per Bottle", format: "number" },
      { key: "profitPerBottleByGlass", label: "Profit per Bottle Sold by the Glass", format: "currency" },
      { key: "profitPerBottleSold", label: "Profit per Bottle Sold Whole", format: "currency" },
    ],
    instructions:
      "Enter your cost per bottle, the glass pour and your target cost percentage by the glass. Set the multiple you use for bottle list prices (often 2.5–4×).",
    examples: "Example: a $14 bottle poured in 5 oz glasses gives about 5.07 glasses. At a 25% cost the glass price is $11.04; on the list, the bottle sells for $42.00.",
    assumptions: "A 750 ml bottle holds 25.36 oz. A common rule is that the first glass sold pays for the bottle. By-the-glass pricing carries a higher margin to cover waste from opened bottles.",
    faq: [
      { question: "How do restaurants price wine by the glass?", answer: "Often so the price of one glass roughly equals the bottle's wholesale cost — a cost of 20–25% per glass." },
      { question: "What is the typical restaurant markup on wine?", answer: "About 2.5 to 4 times wholesale for bottles, with lower multiples on expensive wines." },
    ],
  },
  {
    slug: "cocktail-pricing-calculator",
    title: "Cocktail Pricing Calculator",
    description: "Price a cocktail from the cost per ounce of up to four ingredients plus garnish, at your target pour cost, with the profit per drink and a rounded menu price.",
    metaTitle: "Cocktail Pricing Calculator — Cost & Menu Price",
    metaDescription: "Free cocktail pricing calculator. Add up ingredient and garnish costs and set a cocktail price at your target pour cost, with profit per drink.",
    calcInputs: [
      currencyField("costPerOz1", "Spirit — Cost per Oz", { default: 1.1, max: 100, step: 0.01 }),
      numberField("oz1", "Spirit — Ounces", { unit: "oz", default: 2, max: 10, step: 0.25 }),
      currencyField("costPerOz2", "Liqueur / Modifier — Cost per Oz", { default: 0.9, max: 100, step: 0.01, required: false }),
      numberField("oz2", "Liqueur / Modifier — Ounces", { unit: "oz", default: 0.75, max: 10, step: 0.25, required: false }),
      currencyField("costPerOz3", "Juice / Syrup — Cost per Oz", { default: 0.25, max: 100, step: 0.01, required: false }),
      numberField("oz3", "Juice / Syrup — Ounces", { unit: "oz", default: 1, max: 10, step: 0.25, required: false }),
      currencyField("costPerOz4", "Other — Cost per Oz", { default: 0, max: 100, step: 0.01, required: false }),
      numberField("oz4", "Other — Ounces", { unit: "oz", default: 0, max: 10, step: 0.25, required: false }),
      currencyField("garnishCost", "Garnish & Extras", { default: 0.3, max: 20, step: 0.05, required: false }),
      percentField("pourCostTarget", "Target Pour Cost %", { default: 22, max: 60, step: 1 }),
    ],
    calcResult: { label: "Cocktail Price", format: "currency" },
    calcResults: [
      { key: "cocktailPrice", label: "Cocktail Price at Target", format: "currency", highlight: true },
      { key: "costPerCocktail", label: "Cost per Cocktail", format: "currency" },
      { key: "profitPerCocktail", label: "Profit per Cocktail", format: "currency" },
      { key: "roundedPrice", label: "Rounded Menu Price ($)", format: "number" },
      { key: "pourCostAtRounded", label: "Pour Cost at the Rounded Price", format: "percentage" },
    ],
    instructions:
      "For each ingredient, enter its cost per ounce (bottle cost ÷ ounces in the bottle) and how many ounces go in the drink. Add garnish and extras, and your target pour cost.",
    examples: "Example: 2 oz of spirit at $1.10, 0.75 oz of liqueur at $0.90, 1 oz of juice at $0.25 and a $0.30 garnish cost $3.43. At a 22% pour cost, price it at $15.57 — round to $16 for 21.41%.",
    assumptions: "Cost per ounce = bottle cost ÷ ounces in the bottle (25.4 oz in 750 ml). Craft cocktail bars typically target 18–24% pour cost. Ice, labor and glassware aren't included.",
    faq: [
      { question: "How do you price a cocktail?", answer: "Add up the cost of every ingredient and garnish, then divide by your target pour cost (often around 20%)." },
      { question: "What's a good pour cost for cocktails?", answer: "About 18% to 24%; drinks with expensive spirits often run higher and are balanced by cheaper ones." },
    ],
  },
  {
    slug: "cake-pricing-calculator",
    title: "Cake Pricing Calculator",
    description: "Price a custom cake from ingredients, decorations and supplies, your hours at an hourly rate, overhead and profit — and see the price per serving.",
    metaTitle: "Cake Pricing Calculator — How Much to Charge",
    metaDescription: "Free cake pricing calculator. Price a custom or celebration cake from ingredients, supplies, labor, overhead and profit, with price per serving.",
    calcInputs: [
      currencyField("ingredients", "Ingredients", { default: 28, max: 10000, step: 0.5 }),
      currencyField("packaging", "Decorations, Board & Box", { default: 12, max: 10000, step: 0.5, required: false }),
      numberField("hours", "Hours (Baking, Decorating, Cleanup)", { unit: "hours", default: 5, max: 200, step: 0.25 }),
      currencyField("hourlyRate", "Your Hourly Rate", { default: 20, max: 500, step: 1 }),
      percentField("overheadPercent", "Overhead (Utilities, Equipment)", { default: 10, max: 50, step: 1, required: false }),
      percentField("profitPercent", "Profit", { default: 20, max: 200, step: 1 }),
      numberField("servings", "Servings", { default: 24, min: 1, max: 1000 }),
    ],
    calcResult: { label: "Cake Price", format: "currency" },
    calcResults: [
      { key: "cakePrice", label: "Cake Price", format: "currency", highlight: true },
      { key: "pricePerServing", label: "Price per Serving", format: "currency" },
      { key: "ingredientsAndSupplies", label: "Ingredients & Supplies", format: "currency" },
      { key: "laborCost", label: "Your Labor", format: "currency" },
      { key: "profit", label: "Profit", format: "currency" },
    ],
    instructions:
      "Enter the cost of ingredients and of decorations, cake board and box, then the total hours — including shopping, baking, cooling, decorating and cleanup — and your hourly rate.\n\n" +
      "Add overhead and profit, and the number of servings to compare with per-serving prices.",
    examples: "Example: $28 of ingredients, $12 of supplies and 5 hours at $20 an hour, with 10% overhead and 20% profit, gives a price of $184.80 — $7.70 a serving for 24 people.",
    assumptions: "Price = (ingredients + supplies + labor) × (1 + overhead) × (1 + profit). Custom cake bakers often charge $3–$8 or more per serving depending on design. " + BAKER_NOTE,
    faq: [
      { question: "How much should I charge for a homemade cake?", answer: "Cover ingredients, supplies and a fair hourly wage, add overhead and profit — custom cakes often land at $3 to $8 per serving." },
      { question: "Should I charge per serving or per cake?", answer: "Per serving is common for tiered and custom cakes because it scales with size and design." },
    ],
  },
  {
    slug: "cookie-pricing-calculator",
    title: "Cookie Pricing Calculator",
    description: "Price homemade or decorated cookies per dozen and per cookie from batch ingredients, packaging, your time, overhead and profit.",
    metaTitle: "Cookie Pricing Calculator — Price per Dozen",
    metaDescription: "Free cookie pricing calculator. Price homemade or decorated cookies per dozen and each from ingredients, packaging, labor and profit.",
    calcInputs: [
      currencyField("ingredients", "Ingredients per Batch", { default: 14, max: 10000, step: 0.5 }),
      numberField("cookiesPerBatch", "Cookies per Batch", { default: 36, min: 1, max: 10000 }),
      currencyField("packaging", "Packaging per Batch (Bags, Boxes, Labels)", { default: 6, max: 10000, step: 0.5, required: false }),
      numberField("hours", "Hours per Batch", { unit: "hours", default: 2.5, max: 100, step: 0.25 }),
      currencyField("hourlyRate", "Your Hourly Rate", { default: 18, max: 500, step: 1 }),
      percentField("overheadPercent", "Overhead", { default: 10, max: 50, step: 1, required: false }),
      percentField("profitPercent", "Profit", { default: 25, max: 200, step: 1 }),
    ],
    calcResult: { label: "Price per Dozen", format: "currency" },
    calcResults: [
      { key: "pricePerDozen", label: "Price per Dozen", format: "currency", highlight: true },
      { key: "pricePerCookie", label: "Price per Cookie", format: "currency" },
      { key: "costPerCookie", label: "Cost per Cookie", format: "currency" },
      { key: "batchPrice", label: "Batch Price", format: "currency" },
      { key: "profitPerBatch", label: "Profit per Batch", format: "currency" },
    ],
    instructions:
      "Enter the ingredient and packaging cost for one batch, how many cookies it makes and how long it takes (for decorated sugar cookies, include the decorating time).\n\n" +
      "Add your hourly rate, overhead and profit.",
    examples: "Example: a $14 batch of 36 cookies with $6 of packaging and 2.5 hours at $18 an hour, plus 10% overhead and 25% profit, comes to $29.79 a dozen — $2.48 per cookie.",
    assumptions: "Labor dominates the price of decorated cookies; drop cookies take far less time per dozen. " + BAKER_NOTE,
    faq: [
      { question: "How much should I charge for a dozen cookies?", answer: "Plain drop cookies often sell for $15–$25 a dozen; decorated sugar cookies for $36–$60+ because of the decorating time." },
      { question: "What's the biggest cost in cookies?", answer: "Usually your time, especially for decorated cookies — ingredients are often under a quarter of the price." },
    ],
  },
  {
    slug: "cupcake-pricing-calculator",
    title: "Cupcake Pricing Calculator",
    description: "Price cupcakes per dozen and each from the batter, frosting and toppers per cupcake, liners and boxes, your time, overhead and profit.",
    metaTitle: "Cupcake Pricing Calculator — Price per Dozen",
    metaDescription: "Free cupcake pricing calculator. Price cupcakes each and by the dozen from batter, frosting, toppers, boxes, labor and profit.",
    calcInputs: [
      currencyField("ingredients", "Batter Ingredients per Batch", { default: 9, max: 10000, step: 0.5 }),
      numberField("cupcakesPerBatch", "Cupcakes per Batch", { default: 24, min: 1, max: 10000 }),
      currencyField("frostingPerCupcake", "Frosting per Cupcake", { default: 0.35, max: 50, step: 0.05 }),
      currencyField("linerTopperPerCupcake", "Liner & Topper per Cupcake", { default: 0.2, max: 50, step: 0.05, required: false }),
      currencyField("packaging", "Boxes per Batch", { default: 6, max: 10000, step: 0.5, required: false }),
      numberField("hours", "Hours per Batch", { unit: "hours", default: 3, max: 100, step: 0.25 }),
      currencyField("hourlyRate", "Your Hourly Rate", { default: 18, max: 500, step: 1 }),
      percentField("overheadPercent", "Overhead", { default: 10, max: 50, step: 1, required: false }),
      percentField("profitPercent", "Profit", { default: 25, max: 200, step: 1 }),
    ],
    calcResult: { label: "Price per Dozen", format: "currency" },
    calcResults: [
      { key: "pricePerDozen", label: "Price per Dozen", format: "currency", highlight: true },
      { key: "pricePerCupcake", label: "Price per Cupcake", format: "currency" },
      { key: "costPerCupcake", label: "Cost per Cupcake", format: "currency" },
      { key: "batchPrice", label: "Batch Price", format: "currency" },
      { key: "profitPerBatch", label: "Profit per Batch", format: "currency" },
    ],
    instructions:
      "Enter the batter ingredients for one batch and how many cupcakes it makes, then the frosting and liner/topper cost per cupcake and boxes for the batch.\n\n" +
      "Add your hours, hourly rate, overhead and profit.",
    examples: "Example: a $9 batch of 24 with $0.35 of frosting and $0.20 of liners and toppers each, $6 of boxes and 3 hours at $18, plus 10% overhead and 25% profit: $56.51 a dozen, $4.71 each.",
    assumptions: "Frosting and toppers are priced per cupcake because they vary most with design. Specialty fillings and fondant toppers can double the per-cupcake cost. " + BAKER_NOTE,
    faq: [
      { question: "How much should I charge for cupcakes?", answer: "Homemade cupcakes commonly sell for $24–$48 a dozen, more for filled or custom-decorated cupcakes." },
      { question: "How much frosting does a cupcake need?", answer: "About 2–3 tablespoons for a simple swirl and up to 1/4 cup for a tall piped swirl." },
    ],
  },
  {
    slug: "cinnamon-roll-calculator",
    title: "Cinnamon Roll Calculator",
    description: "Price homemade cinnamon rolls per roll and per pan from the dough, filling and icing, packaging, your time (including proofing), overhead and profit.",
    metaTitle: "Cinnamon Roll Calculator — Price per Roll & Pan",
    metaDescription: "Free cinnamon roll pricing calculator. Price homemade cinnamon rolls per roll and per pan from ingredients, icing, packaging, time and profit.",
    calcInputs: [
      currencyField("ingredients", "Dough & Filling Ingredients per Batch", { default: 11, max: 10000, step: 0.5 }),
      numberField("rollsPerBatch", "Rolls per Batch", { default: 12, min: 1, max: 1000 }),
      currencyField("icingPerRoll", "Icing / Frosting per Roll", { default: 0.3, max: 20, step: 0.05, required: false }),
      currencyField("packaging", "Pans & Packaging per Batch", { default: 4, max: 1000, step: 0.5, required: false }),
      numberField("hours", "Hands-On Hours per Batch", { unit: "hours", default: 2, max: 50, step: 0.25 }),
      currencyField("hourlyRate", "Your Hourly Rate", { default: 18, max: 500, step: 1 }),
      percentField("overheadPercent", "Overhead", { default: 10, max: 50, step: 1, required: false }),
      percentField("profitPercent", "Profit", { default: 25, max: 200, step: 1 }),
      numberField("panSize", "Rolls per Pan Sold", { default: 6, min: 1, max: 48 }),
    ],
    calcResult: { label: "Price per Pan", format: "currency" },
    calcResults: [
      { key: "pricePerPan", label: "Price per Pan", format: "currency", highlight: true },
      { key: "pricePerRoll", label: "Price per Roll", format: "currency" },
      { key: "costPerRoll", label: "Cost per Roll", format: "currency" },
      { key: "batchPrice", label: "Batch Price", format: "currency" },
      { key: "profitPerBatch", label: "Profit per Batch", format: "currency" },
    ],
    instructions:
      "Enter the dough and filling ingredients for a batch and how many rolls it makes, the icing per roll, and pans or boxes. Count your hands-on time — mixing, rolling, shaping and icing — but not the hours the dough is rising on its own.\n\n" +
      "Add your hourly rate, overhead, profit and how many rolls you sell in a pan.",
    examples: "Example: $11 of dough and filling for 12 rolls, $0.30 of icing each, $4 of pans and 2 hands-on hours at $18, with 10% overhead and 25% profit: $6.26 a roll, or $37.54 for a pan of six.",
    assumptions: "Large gourmet rolls sell for about $4–$7 each at bakeries and markets. Butter and cream cheese frosting are the priciest ingredients. " + BAKER_NOTE,
    faq: [
      { question: "How much should I sell cinnamon rolls for?", answer: "Homemade rolls commonly sell for $3 to $6 each, or $18 to $36 for a pan of six, depending on size and frosting." },
      { question: "Should I charge for proofing time?", answer: "Charge for hands-on time; rising time is passive, though it does limit how many batches you can make." },
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
