/**
 * Batch: "Shopping Calculators" → Pricing, Markup & Seller Fee — food and
 * drink pricing (11 tools).
 *
 *  - foodCost: a restaurant's food cost % for a period from inventory and
 *    purchases (COGS ÷ food sales).
 *  - menuPricing: a menu price from one plate's cost and a target food
 *    cost %, rounded to a menu-friendly price.
 *  - recipeCost (also cost per serving, baking cost): up to six ingredients
 *    priced from package price and size, per batch and per serving.
 *  - liquorPricing: price per shot from bottle cost, pour size and pour cost.
 *  - beerPricing: price per serving from keg or case size and pour cost.
 *  - winePricing: by-the-glass and bottle list prices.
 *  - cocktailPricing: up to four ingredients by the ounce plus garnish.
 *  - cakePricing, cookiePricing, cupcakePricing, cinnamonRollPricing:
 *    home-bakery pricing from ingredients, per-item supplies, labor at an
 *    hourly rate, overhead and profit — each priced in the unit customers
 *    buy (per cake and serving, per dozen, per pan).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-price-food-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const pct = (v: number) => nonNeg(v) / 100;

export const foodCost: CustomCalculator = (v) => {
  const cogs = Math.max(0, nonNeg(v.beginningInventory) + nonNeg(v.purchases) - nonNeg(v.endingInventory));
  const sales = nonNeg(v.foodSales);
  const p = sales > 0 ? cogs / sales : 0;
  return {
    foodCostPercent: round2(p * 100),
    costOfGoodsSold: round2(cogs),
    grossProfit: round2(sales - cogs),
    vsTarget: round2(p * 100 - nonNeg(v.targetPercent)),
    overspendVsTarget: round2(Math.max(0, cogs - sales * pct(v.targetPercent))),
  };
};

export const menuPricing: CustomCalculator = (v) => {
  const plate = nonNeg(v.plateCost);
  const target = Math.min(0.95, pct(v.targetFoodCost));
  const price = target > 0 ? plate / target : 0;
  const rounded = price > 0 ? Math.max(0.99, Math.ceil(price) - (safeNumber(v.rounding) === 1 ? 0.05 : safeNumber(v.rounding) === 2 ? 0 : 0.01)) : 0;
  return {
    menuPrice: round2(rounded),
    exactPrice: round2(price),
    grossProfitPerPlate: round2(rounded - plate),
    actualFoodCostPercent: rounded > 0 ? round2((plate / rounded) * 100) : 0,
    markupMultiple: plate > 0 ? round2(rounded / plate) : 0,
  };
};

export const recipeCost: CustomCalculator = (v) => {
  let total = 0;
  for (let i = 1; i <= 6; i++) {
    const pack = nonNeg(v[`size${i}`]);
    if (pack > 0) total += (nonNeg(v[`price${i}`]) / pack) * nonNeg(v[`used${i}`]);
  }
  total += nonNeg(v.extras);
  const servings = Math.max(1, nonNeg(v.servings) || 1);
  const perServing = total / servings;
  return {
    costPerServing: round2(perServing),
    totalRecipeCost: round2(total),
    priceAt30PercentFoodCost: round2(perServing / 0.3),
    priceWithMarkup: round2(perServing * (1 + pct(v.markupPercent))),
  };
};

export const liquorPricing: CustomCalculator = (v) => {
  const bottle = nonNeg(v.bottleCost);
  const oz = nonNeg(v.bottleMl) / 29.5735;
  const usable = oz * (1 - pct(v.spillage));
  const pour = Math.max(0.25, nonNeg(v.pourOz) || 1.5);
  const pours = usable / pour;
  const costPerPour = pours > 0 ? bottle / pours : 0;
  const target = Math.min(0.95, pct(v.pourCostTarget));
  const price = target > 0 ? costPerPour / target : 0;
  return {
    pricePerDrink: round2(price),
    costPerPour: round2(costPerPour),
    poursPerBottle: round2(pours),
    revenuePerBottle: round2(price * pours),
    profitPerBottle: round2(price * pours - bottle),
  };
};

const BEER_OZ = [1984, 992, 661, 288, 144]; // half barrel, quarter, sixtel, case of 24×12 oz, case of 12×12 oz

export const beerPricing: CustomCalculator = (v) => {
  const oz = BEER_OZ[Math.min(4, Math.max(0, Math.round(safeNumber(v.container))))];
  const usable = oz * (1 - pct(v.waste));
  const serving = Math.max(1, nonNeg(v.servingOz) || 16);
  const servings = usable / serving;
  const cost = servings > 0 ? nonNeg(v.containerCost) / servings : 0;
  const target = Math.min(0.95, pct(v.pourCostTarget));
  const price = target > 0 ? cost / target : 0;
  return {
    pricePerServing: round2(price),
    costPerServing: round2(cost),
    servingsPerContainer: round2(servings),
    revenuePerContainer: round2(price * servings),
    profitPerContainer: round2(price * servings - nonNeg(v.containerCost)),
  };
};

export const winePricing: CustomCalculator = (v) => {
  const bottle = nonNeg(v.bottleCost);
  const glasses = 25.36 / Math.max(1, nonNeg(v.pourOz) || 5);
  const target = Math.min(0.95, pct(v.glassCostTarget));
  const glassPrice = target > 0 ? bottle / glasses / target : 0;
  const bottlePrice = bottle * nonNeg(v.bottleMultiple, 3);
  return {
    glassPrice: round2(glassPrice),
    bottleListPrice: round2(bottlePrice),
    glassesPerBottle: round2(glasses),
    profitPerBottleByGlass: round2(glassPrice * glasses - bottle),
    profitPerBottleSold: round2(bottlePrice - bottle),
  };
};

export const cocktailPricing: CustomCalculator = (v) => {
  let cost = nonNeg(v.garnishCost);
  for (let i = 1; i <= 4; i++) cost += nonNeg(v[`costPerOz${i}`]) * nonNeg(v[`oz${i}`]);
  const target = Math.min(0.95, pct(v.pourCostTarget));
  const price = target > 0 ? cost / target : 0;
  return {
    cocktailPrice: round2(price),
    costPerCocktail: round2(cost),
    profitPerCocktail: round2(price - cost),
    roundedPrice: price > 0 ? Math.ceil(price) : 0,
    pourCostAtRounded: price > 0 ? round2((cost / Math.ceil(price)) * 100) : 0,
  };
};

/** Shared home-bakery pricing: everything per batch, divided into units. */
function bake(v: Record<string, number>, perUnitSupplies: number, units: number) {
  const n = Math.max(1, units);
  const materials = nonNeg(v.ingredients) + perUnitSupplies * n + nonNeg(v.packaging);
  const labor = nonNeg(v.hours) * nonNeg(v.hourlyRate);
  const overhead = (materials + labor) * pct(v.overheadPercent);
  const cost = materials + labor + overhead;
  const price = cost * (1 + pct(v.profitPercent));
  return { materials, labor, cost, price, n };
}

export const cakePricing: CustomCalculator = (v) => {
  const b = bake(v, 0, 1);
  const servings = Math.max(1, nonNeg(v.servings) || 1);
  return {
    cakePrice: round2(b.price),
    pricePerServing: round2(b.price / servings),
    ingredientsAndSupplies: round2(b.materials),
    laborCost: round2(b.labor),
    profit: round2(b.price - b.cost),
  };
};

export const cookiePricing: CustomCalculator = (v) => {
  const b = bake(v, 0, nonNeg(v.cookiesPerBatch) || 1);
  const each = b.price / b.n;
  return {
    pricePerDozen: round2(each * 12),
    pricePerCookie: round2(each),
    costPerCookie: round2(b.cost / b.n),
    batchPrice: round2(b.price),
    profitPerBatch: round2(b.price - b.cost),
  };
};

export const cupcakePricing: CustomCalculator = (v) => {
  const b = bake(v, nonNeg(v.frostingPerCupcake) + nonNeg(v.linerTopperPerCupcake), nonNeg(v.cupcakesPerBatch) || 1);
  const each = b.price / b.n;
  return {
    pricePerDozen: round2(each * 12),
    pricePerCupcake: round2(each),
    costPerCupcake: round2(b.cost / b.n),
    batchPrice: round2(b.price),
    profitPerBatch: round2(b.price - b.cost),
  };
};

export const cinnamonRollPricing: CustomCalculator = (v) => {
  const rolls = nonNeg(v.rollsPerBatch) || 1;
  const b = bake(v, nonNeg(v.icingPerRoll), rolls);
  const each = b.price / b.n;
  const panSize = Math.max(1, Math.round(nonNeg(v.panSize) || 6));
  return {
    pricePerPan: round2(each * panSize),
    pricePerRoll: round2(each),
    costPerRoll: round2(b.cost / b.n),
    batchPrice: round2(b.price),
    profitPerBatch: round2(b.price - b.cost),
  };
};

export const shoppingPriceFoodCustomCalculators: Record<string, CustomCalculator> = {
  "food-cost-calculator": foodCost,
  "menu-pricing-calculator": menuPricing,
  "recipe-cost-calculator": recipeCost,
  "liquor-pricing-calculator": liquorPricing,
  "beer-pricing-calculator": beerPricing,
  "wine-pricing-calculator": winePricing,
  "cocktail-pricing-calculator": cocktailPricing,
  "cake-pricing-calculator": cakePricing,
  "cookie-pricing-calculator": cookiePricing,
  "cupcake-pricing-calculator": cupcakePricing,
  "cinnamon-roll-calculator": cinnamonRollPricing,
};
