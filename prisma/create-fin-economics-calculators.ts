// One-time (but safe to re-run) batch setup script: creates the 11 tools of
// the finance sub-batch "Economics". See
// src/lib/calc-engine-fin-valuation.ts for the full list of 5 sub-batches,
// and src/lib/calc-engine-fin-economics.ts for the math.
// Each tool is filed in the Finance Calculators sub-category the user named
// for it (created on first run).
//
// HOW TO RUN
//   npx tsx prisma/create-fin-economics-calculators.ts
// or
//   npm run db:create-fin-economics-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const FINANCE_SLUGS = ["finance-calculators", "finance"];

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
    max: opts.max ?? 1000000,
    step: opts.step ?? 1,
  };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

interface ToolDef {
  slug: string;
  category: { name: string; slug: string };
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

const num = (key: string, label: string, highlight = false, decimals?: number) => ({ key, label, format: "number", ...(decimals !== undefined ? { decimals } : {}), ...(highlight ? { highlight: true } : {}) });
const pct = (key: string, label: string, highlight = false) => ({ key, label, format: "percentage", ...(highlight ? { highlight: true } : {}) });
const cur = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", ...(highlight ? { highlight: true } : {}) });


// Tool categories follow the 14 Oct 2026 consolidation of the Finance sub-categories
// (see prisma/consolidate-finance-subcategories.ts).
const MICROECONOMICS_CATEGORY = { name: "Microeconomics Calculators", slug: "microeconomics-calculators" };
const MACROECONOMICS_CATEGORY = { name: "Macroeconomics Calculators", slug: "macroeconomics-calculators" };

const ECON_NOTE = "These are standard textbook formulas for learning, homework and quick business estimates; real markets rarely follow straight-line curves exactly.";

const METHOD = dropdown("method", "Formula", [["Midpoint (arc) method", 1], ["Simple % change", 2]], 1);

const TOOLS: ToolDef[] = [
  {
    slug: "price-elasticity-of-demand-calculator",
    category: MICROECONOMICS_CATEGORY,
    title: "Price Elasticity of Demand Calculator",
    description: "Calculate the price elasticity of demand (PED) from two prices and quantities with the midpoint formula — elastic, inelastic or unit elastic — and the effect on total revenue.",
    metaTitle: "Price Elasticity of Demand Calculator — Midpoint Formula",
    metaDescription: "Free price elasticity of demand calculator. Use the midpoint (arc) or simple formula to find PED, whether demand is elastic or inelastic, and revenue change.",
    calcInputs: [currencyField("initialPrice", "Initial Price", { default: 10, max: 100000000, step: 0.01 }), currencyField("newPrice", "New Price", { default: 12, max: 100000000, step: 0.01 }), numberField("initialQuantity", "Initial Quantity Demanded", { default: 1000, max: 1000000000 }), numberField("newQuantity", "New Quantity Demanded", { default: 800, max: 1000000000 }), METHOD],
    calcResult: { label: "Price Elasticity", format: "number", decimals: 4 },
    calcResults: [pct("pctChangeQuantity", "% Change in Quantity"), pct("pctChangePrice", "% Change in Price"), num("elasticity", "Price Elasticity of Demand", true, 4), num("absoluteElasticity", "Absolute Value |PED|", false, 4), num("classification", "Demand Is (1 Elastic, 2 Unit Elastic, 3 Inelastic, 4 Perfectly Inelastic)"), cur("revenueChange", "Change in Total Revenue")],
    instructions:
      "Enter the price and quantity sold before and after a price change. The midpoint method gives the same answer whichever direction the price moves, which is why economics courses use it.\n\n" +
      "If |PED| is above 1, demand is elastic: raising the price lowers total revenue. Below 1 it is inelastic: raising the price raises revenue.",
    examples: "Example: raising the price from $10 to $12 cuts sales from 1,000 to 800. With the midpoint method quantity falls 22.22% and price rises 18.18%, so PED = −1.22 — elastic. Revenue drops from $10,000 to $9,600.",
    assumptions: "Midpoint: %Δ = (new − old) ÷ ((new + old) ÷ 2). PED is negative for normal demand; it's usually discussed as an absolute value. " + ECON_NOTE,
    faq: [
      { question: "What makes demand elastic?", answer: "Close substitutes, a large share of the budget, luxury items and a long time to adjust." },
      { question: "Why is price elasticity negative?", answer: "Price and quantity demanded move in opposite directions — the law of demand." },
    ],
  },
  {
    slug: "income-elasticity-of-demand-calculator",
    category: MICROECONOMICS_CATEGORY,
    title: "Income Elasticity of Demand Calculator",
    description: "Calculate the income elasticity of demand (YED) from two income levels and quantities, and see whether a good is a luxury, a necessity or an inferior good.",
    metaTitle: "Income Elasticity of Demand Calculator — YED",
    metaDescription: "Free income elasticity of demand calculator. Find YED with the midpoint formula and classify a good as luxury, normal necessity or inferior.",
    calcInputs: [currencyField("initialIncome", "Initial Income", { default: 50000, max: 1000000000, step: 100 }), currencyField("newIncome", "New Income", { default: 60000, max: 1000000000, step: 100 }), numberField("initialQuantity", "Initial Quantity Demanded", { default: 20, max: 1000000000 }), numberField("newQuantity", "New Quantity Demanded", { default: 26, max: 1000000000 }), METHOD],
    calcResult: { label: "Income Elasticity", format: "number", decimals: 4 },
    calcResults: [pct("pctChangeQuantity", "% Change in Quantity"), pct("pctChangeIncome", "% Change in Income"), num("incomeElasticity", "Income Elasticity of Demand", true, 4), num("goodType", "Good Type (1 Luxury, 2 Necessity, 3 Inferior, 4 No Effect)")],
    instructions: "Enter consumer income and the quantity bought before and after the income change. Income can be one household's or a country's average.",
    examples: "Example: income rises from $50,000 to $60,000 and restaurant meals go from 20 to 26 a year. Quantity rises 26.09% and income 18.18%, so YED = 1.43 — a luxury good.",
    assumptions: "YED = %ΔQ ÷ %ΔIncome. Above 1: luxury (normal good, demand grows faster than income); 0–1: necessity; below 0: inferior good. " + ECON_NOTE,
    faq: [
      { question: "What is an inferior good?", answer: "One people buy less of as they get richer — for example instant noodles or bus rides when people switch to cars." },
      { question: "How is this different from price elasticity?", answer: "Price elasticity measures response to the good's own price; income elasticity measures response to buyers' income." },
    ],
  },
  {
    slug: "cross-price-elasticity-calculator",
    category: MICROECONOMICS_CATEGORY,
    title: "Cross Price Elasticity Calculator",
    description: "Calculate the cross-price elasticity of demand between two goods and find out whether they are substitutes, complements or unrelated.",
    metaTitle: "Cross-Price Elasticity Calculator — Substitutes or Not",
    metaDescription: "Free cross price elasticity calculator. Measure how demand for one good responds to another good's price and classify them as substitutes or complements.",
    calcInputs: [currencyField("initialPriceB", "Initial Price of Good B", { default: 4, max: 100000000, step: 0.01 }), currencyField("newPriceB", "New Price of Good B", { default: 5, max: 100000000, step: 0.01 }), numberField("initialQuantityA", "Initial Quantity of Good A", { default: 500, max: 1000000000 }), numberField("newQuantityA", "New Quantity of Good A", { default: 560, max: 1000000000 }), METHOD],
    calcResult: { label: "Cross-Price Elasticity", format: "number", decimals: 4 },
    calcResults: [pct("pctChangeQuantityA", "% Change in Quantity of A"), pct("pctChangePriceB", "% Change in Price of B"), num("crossElasticity", "Cross-Price Elasticity", true, 4), num("relationship", "Goods Are (1 Substitutes, 2 Complements, 3 Unrelated)")],
    instructions: "Enter the price of good B before and after a change, and how much of good A was bought each time.",
    examples: "Example: coffee (B) goes from $4 to $5 and tea (A) sales rise from 500 to 560. Tea quantity rises 11.32% while coffee's price rises 22.22%: XED = 0.51, so they are substitutes.",
    assumptions: "XED = %ΔQ of A ÷ %ΔP of B. Positive = substitutes; negative = complements (like printers and ink); near zero = unrelated. " + ECON_NOTE,
    faq: [
      { question: "What does a large cross elasticity mean?", answer: "The goods are close substitutes — competitors — and a price rise sends buyers to the other product quickly." },
      { question: "Can it be used in competition cases?", answer: "Yes — regulators use it to define which products compete in the same market." },
    ],
  },
  {
    slug: "consumer-surplus-calculator",
    category: MICROECONOMICS_CATEGORY,
    title: "Consumer Surplus Calculator",
    description: "Calculate consumer surplus — and producer and total surplus — from a linear demand curve's maximum price, the market price and the quantity sold.",
    metaTitle: "Consumer Surplus Calculator — Consumer & Producer Surplus",
    metaDescription: "Free consumer surplus calculator. Find consumer surplus, producer surplus and total economic surplus from maximum price, market price and quantity.",
    calcInputs: [currencyField("maxPrice", "Maximum Price Buyers Will Pay (demand intercept)", { default: 50, max: 100000000, step: 0.01 }), currencyField("marketPrice", "Market (Equilibrium) Price", { default: 30, max: 100000000, step: 0.01 }), numberField("quantity", "Quantity Sold", { default: 400, max: 1000000000 }), currencyField("minSupplyPrice", "Lowest Price Sellers Will Accept (supply intercept)", { default: 10, max: 100000000, step: 0.01, required: false })],
    calcResult: { label: "Consumer Surplus", format: "currency" },
    calcResults: [cur("consumerSurplus", "Consumer Surplus", true), cur("producerSurplus", "Producer Surplus"), cur("totalSurplus", "Total Surplus"), cur("totalSpending", "Total Spending"), cur("surplusPerUnit", "Average Consumer Surplus per Unit")],
    instructions: "Enter the price at which nobody would buy (where the demand curve meets the price axis), the market price and the quantity sold. Add the supply curve's intercept to get producer surplus too.",
    examples: "Example: buyers would pay up to $50, the price is $30 and 400 units sell. Consumer surplus = ½ × 400 × ($50 − $30) = $4,000. With a $10 supply intercept, producer surplus is also $4,000.",
    assumptions: "Straight-line demand and supply curves: each surplus is a triangle, ½ × quantity × price gap. " + ECON_NOTE,
    faq: [
      { question: "What is consumer surplus?", answer: "The difference between what buyers would be willing to pay and what they actually pay, added up over all buyers." },
      { question: "What happens to consumer surplus when price rises?", answer: "It shrinks — buyers pay more and some stop buying." },
    ],
  },
  {
    slug: "mpc-calculator",
    category: MACROECONOMICS_CATEGORY,
    title: "MPC Calculator",
    description: "Calculate the marginal propensity to consume (MPC) and save (MPS), the spending and tax multipliers, and how much a change in spending moves GDP.",
    metaTitle: "MPC Calculator — Marginal Propensity to Consume & Multiplier",
    metaDescription: "Free MPC calculator. Find the marginal propensity to consume and save, the spending multiplier and tax multiplier, and the GDP effect of new spending.",
    calcInputs: [currencyField("initialIncome", "Initial Disposable Income", { default: 40000, max: 100000000000, step: 100 }), currencyField("newIncome", "New Disposable Income", { default: 45000, max: 100000000000, step: 100 }), currencyField("initialConsumption", "Initial Consumption", { default: 32000, max: 100000000000, step: 100 }), currencyField("newConsumption", "New Consumption", { default: 36000, max: 100000000000, step: 100 }), numberField("spendingChange", "Change in Spending to Test (optional)", { unit: "$", default: 0, min: -100000000000, max: 100000000000, step: 100, required: false })],
    calcResult: { label: "MPC", format: "number", decimals: 4 },
    calcResults: [cur("changeInIncome", "Change in Income"), cur("changeInConsumption", "Change in Consumption"), num("mpc", "Marginal Propensity to Consume (MPC)", true, 4), num("mps", "Marginal Propensity to Save (MPS)", false, 4), num("spendingMultiplier", "Spending Multiplier"), num("taxMultiplier", "Tax Multiplier"), cur("gdpImpact", "GDP Impact of the Spending Change")],
    instructions: "Enter income and consumption before and after a change. MPC is the share of each extra dollar of income that is spent. Optionally enter a change in government or investment spending to see its total effect on GDP through the multiplier.",
    examples: "Example: income rises $5,000 and spending rises $4,000, so MPC = 0.8 and MPS = 0.2. The spending multiplier is 1 ÷ 0.2 = 5, so $1 billion of new spending raises GDP by about $5 billion.",
    assumptions: "MPS = 1 − MPC; spending multiplier = 1 ÷ (1 − MPC); tax multiplier = −MPC ÷ (1 − MPC). Simple Keynesian model with no taxes on extra income, imports or price changes, so real multipliers are smaller. " + ECON_NOTE,
    faq: [
      { question: "Why do lower-income households have a higher MPC?", answer: "They spend more of any extra income on needs, while richer households save more of it." },
      { question: "Why is the tax multiplier smaller than the spending multiplier?", answer: "Part of a tax cut is saved before it is spent, so the first round of spending is smaller." },
    ],
  },
  {
    slug: "deadweight-loss-calculator",
    category: MICROECONOMICS_CATEGORY,
    title: "Deadweight Loss Calculator",
    description: "Calculate the deadweight loss from a tax, tariff or price control — the lost economic surplus from trades that no longer happen — and the tax revenue raised.",
    metaTitle: "Deadweight Loss Calculator — Tax & Price Control DWL",
    metaDescription: "Free deadweight loss calculator. Find the DWL triangle from the quantity drop and the tax or price wedge, plus tax revenue and loss per dollar raised.",
    calcInputs: [numberField("originalQuantity", "Quantity Before (equilibrium)", { default: 1000, max: 1000000000 }), numberField("newQuantity", "Quantity After", { default: 800, max: 1000000000 }), currencyField("priceWedge", "Price Wedge (tax per unit, or buyer − seller price)", { default: 5, max: 100000000, step: 0.01 }), currencyField("originalPrice", "Original Price (optional)", { default: 0, max: 100000000, step: 0.01, required: false })],
    calcResult: { label: "Deadweight Loss", format: "currency" },
    calcResults: [num("quantityLost", "Quantity Lost"), cur("deadweightLoss", "Deadweight Loss", true), cur("taxRevenue", "Tax Revenue (wedge × new quantity)"), num("dwlPerDollarOfRevenue", "DWL per $1 of Revenue"), pct("dwlShareOfMarket", "DWL as % of Original Spending")],
    instructions: "Enter the quantity traded before and after the policy, and the wedge it drives between what buyers pay and what sellers keep — for a tax, that's the tax per unit. For a price ceiling or floor, use the gap between the demand and supply prices at the restricted quantity.",
    examples: "Example: a $5-per-unit tax cuts sales from 1,000 to 800. Deadweight loss = ½ × $5 × 200 = $500, while the tax raises $4,000 — 13 cents of lost surplus per dollar raised.",
    assumptions: "Straight-line supply and demand, so the deadweight loss is the triangle ½ × wedge × lost quantity. The tax-revenue line only applies to taxes. " + ECON_NOTE,
    faq: [
      { question: "Why does a tax create deadweight loss?", answer: "Some trades worth more to buyers than they cost sellers no longer happen; that lost value goes to nobody." },
      { question: "Which taxes have the smallest deadweight loss?", answer: "Taxes on goods with inelastic demand or supply, because quantity hardly changes." },
    ],
  },
  {
    slug: "comparative-advantage-calculator",
    category: MACROECONOMICS_CATEGORY,
    title: "Comparative Advantage Calculator",
    description: "Find who has the comparative and absolute advantage in two goods from each producer's output, the opportunity costs, and the range of terms of trade that benefits both.",
    metaTitle: "Comparative Advantage Calculator — Opportunity Cost & Trade",
    metaDescription: "Free comparative advantage calculator. Compare two producers' output of two goods to find opportunity costs, absolute and comparative advantage and trade terms.",
    calcInputs: [numberField("producerAGoodX", "Producer A — Max Output of Good X", { default: 40, max: 1000000000 }), numberField("producerAGoodY", "Producer A — Max Output of Good Y", { default: 20, max: 1000000000 }), numberField("producerBGoodX", "Producer B — Max Output of Good X", { default: 30, max: 1000000000 }), numberField("producerBGoodY", "Producer B — Max Output of Good Y", { default: 30, max: 1000000000 })],
    calcResult: { label: "Comparative Advantage in X", format: "number" },
    calcResults: [num("oppCostAofX", "A's Opportunity Cost of 1 X (in Y)", false, 4), num("oppCostAofY", "A's Opportunity Cost of 1 Y (in X)", false, 4), num("oppCostBofX", "B's Opportunity Cost of 1 X (in Y)", false, 4), num("oppCostBofY", "B's Opportunity Cost of 1 Y (in X)", false, 4), num("comparativeAdvantageX", "Comparative Advantage in X (1 = A, 2 = B, 0 = neither)", true), num("comparativeAdvantageY", "Comparative Advantage in Y (1 = A, 2 = B, 0 = neither)"), num("absoluteAdvantageX", "Absolute Advantage in X (1 = A, 2 = B, 0 = tie)"), num("absoluteAdvantageY", "Absolute Advantage in Y (1 = A, 2 = B, 0 = tie)"), num("termsOfTradeMin", "Terms of Trade — Min Y per X", false, 4), num("termsOfTradeMax", "Terms of Trade — Max Y per X", false, 4)],
    instructions: "Enter how much of each good each producer (person, firm or country) could make with the same resources if it made only that good. The producer with the lower opportunity cost of a good has the comparative advantage in it and should specialise in it.",
    examples: "Example: A can make 40 X or 20 Y; B can make 30 X or 30 Y. A gives up 0.5 Y per X and B gives up 1 Y per X, so A has the comparative advantage in X and B in Y. Trade at any price between 0.5 and 1 Y per X helps both.",
    assumptions: "Output-based (\"output\") problems with constant opportunity costs. If your problem gives hours or inputs needed per unit (\"input\" problems), convert to output per period first. " + ECON_NOTE,
    faq: [
      { question: "Can a country gain from trade if it is worse at making everything?", answer: "Yes — it still has a comparative advantage in something, and specialising in it lets both sides consume more." },
      { question: "What's the difference between absolute and comparative advantage?", answer: "Absolute advantage is producing more; comparative advantage is producing at a lower opportunity cost." },
    ],
  },
  {
    slug: "gdp-calculator",
    category: MACROECONOMICS_CATEGORY,
    title: "GDP Calculator",
    description: "Calculate gross domestic product (GDP) with the expenditure approach — consumption, investment, government spending and net exports — and real GDP with a deflator.",
    metaTitle: "GDP Calculator — Expenditure Approach (C + I + G + NX)",
    metaDescription: "Free GDP calculator. Add consumption, investment, government spending and net exports to get nominal GDP, real GDP with a deflator, and each component's share.",
    calcInputs: [numberField("consumption", "Consumption (C)", { unit: "$ billions", default: 19000, min: 0, max: 1000000000, step: 1 }), numberField("investment", "Investment (I)", { unit: "$ billions", default: 5200, min: -1000000000, max: 1000000000, step: 1 }), numberField("government", "Government Spending (G)", { unit: "$ billions", default: 4900, max: 1000000000, step: 1 }), numberField("exports", "Exports (X)", { unit: "$ billions", default: 3200, max: 1000000000, step: 1 }), numberField("imports", "Imports (M)", { unit: "$ billions", default: 4100, max: 1000000000, step: 1 }), numberField("gdpDeflator", "GDP Deflator (optional, base = 100)", { default: 0, max: 10000, step: 0.01, required: false })],
    calcResult: { label: "Nominal GDP", format: "number" },
    calcResults: [num("netExports", "Net Exports (X − M)"), num("nominalGdp", "Nominal GDP", true), num("realGdp", "Real GDP"), pct("consumptionShare", "Consumption Share"), pct("investmentShare", "Investment Share"), pct("governmentShare", "Government Share")],
    instructions: "Enter each spending component in the same units (for example $ billions). Add the GDP deflator to convert nominal GDP to real GDP in base-year prices.",
    examples: "Example: C 19,000 + I 5,200 + G 4,900 + (X 3,200 − M 4,100) = $28,200 billion. With a deflator of 120, real GDP is $23,500 billion.",
    assumptions: "GDP = C + I + G + (X − M). Government spending means purchases of goods and services, not transfer payments like pensions. Real GDP = nominal ÷ deflator × 100. " + ECON_NOTE,
    faq: [
      { question: "Why are imports subtracted?", answer: "Imports are already counted in C, I and G but weren't produced at home, so they are taken back out." },
      { question: "What's the difference between nominal and real GDP?", answer: "Nominal uses current prices; real removes inflation so you can compare output across years." },
    ],
  },
  {
    slug: "gdp-per-capita-calculator",
    category: MACROECONOMICS_CATEGORY,
    title: "GDP Per Capita Calculator",
    description: "Calculate GDP per capita from a country's GDP and population — per year, month and day — and its growth from a previous figure.",
    metaTitle: "GDP Per Capita Calculator — Output per Person",
    metaDescription: "Free GDP per capita calculator. Divide GDP by population to get output per person per year, month and day, and the growth from last year's figure.",
    calcInputs: [numberField("gdpBillions", "GDP ($ billions)", { default: 30000, max: 1000000000, step: 1 }), numberField("populationMillions", "Population (millions)", { default: 342, max: 100000, step: 0.1 }), currencyField("priorPerCapita", "Previous GDP per Capita (optional)", { default: 0, max: 10000000, step: 1, required: false })],
    calcResult: { label: "GDP per Capita", format: "currency" },
    calcResults: [cur("gdpPerCapita", "GDP per Capita", true), cur("gdpPerCapitaMonthly", "Per Month"), cur("gdpPerCapitaDaily", "Per Day"), pct("growthVsPrior", "Growth vs Previous")],
    instructions: "Enter GDP in billions and population in millions. Add a previous year's GDP per capita to see growth (use real GDP for both to measure growth in living standards).",
    examples: "Example: a $30,000 billion economy with 342 million people has GDP per capita of about $87,719 — about $7,310 per person per month.",
    assumptions: "GDP per capita = GDP ÷ population. It measures average output, not income distribution or wellbeing; compare countries at purchasing power parity (PPP) for living standards. " + ECON_NOTE,
    faq: [
      { question: "Is GDP per capita the same as average income?", answer: "No — it includes output that isn't paid to households, such as company profits kept and depreciation." },
      { question: "What is GDP per capita PPP?", answer: "GDP per person adjusted for price levels, so a dollar buys the same amount in every country." },
    ],
  },
  {
    slug: "unemployment-rate-calculator",
    category: MACROECONOMICS_CATEGORY,
    title: "Unemployment Rate Calculator",
    description: "Calculate the unemployment rate, labor force, labor force participation rate and employment-population ratio from employed, unemployed and working-age population.",
    metaTitle: "Unemployment Rate Calculator — Labor Force & Participation",
    metaDescription: "Free unemployment rate calculator. Get the unemployment rate, labor force, participation rate and employment-population ratio from three numbers.",
    calcInputs: [numberField("unemployed", "Unemployed (millions)", { default: 7.4, max: 100000, step: 0.01 }), numberField("employed", "Employed (millions)", { default: 163, max: 100000, step: 0.01 }), numberField("workingAgePopulation", "Working-Age Population, 16+ (millions, optional)", { default: 274, max: 100000, step: 0.01, required: false })],
    calcResult: { label: "Unemployment Rate", format: "percentage" },
    calcResults: [num("laborForce", "Labor Force"), pct("unemploymentRate", "Unemployment Rate", true), pct("employmentRate", "Employed Share of Labor Force"), pct("participationRate", "Labor Force Participation Rate"), pct("employmentPopulationRatio", "Employment-Population Ratio"), num("notInLaborForce", "Not in Labor Force")],
    instructions: "Enter the number of people employed and unemployed (people without work who looked for a job in the last four weeks). Add the civilian working-age population to get participation. Any units work, as long as they're the same.",
    examples: "Example: 7.4 million unemployed and 163 million employed make a labor force of 170.4 million and an unemployment rate of 4.34%. With 274 million people aged 16+, participation is 62.19%.",
    assumptions: "Unemployment rate = unemployed ÷ (employed + unemployed) — the BLS U-3 definition. Discouraged workers who stopped looking are outside the labor force, so they don't count as unemployed. " + ECON_NOTE,
    faq: [
      { question: "Why can unemployment fall when nobody finds a job?", answer: "If jobless people stop looking, they leave the labor force and the rate drops." },
      { question: "What is a normal unemployment rate?", answer: "In the US, roughly 4–5% is usually seen as near full employment." },
    ],
  },
  {
    slug: "growth-rate-calculator",
    category: MACROECONOMICS_CATEGORY,
    title: "Growth Rate Calculator",
    description: "Calculate the growth rate between two values — total growth, average and compound growth per period, the continuous rate, doubling time and a projection.",
    metaTitle: "Growth Rate Calculator — Compound, Average & Doubling Time",
    metaDescription: "Free growth rate calculator. Find percentage growth between two values, average and compound growth per period, continuous rate, doubling time and a projection.",
    calcInputs: [numberField("startValue", "Starting Value", { default: 1000, max: 1000000000000, step: 0.01 }), numberField("endValue", "Ending Value", { default: 1500, max: 1000000000000, step: 0.01 }), numberField("periods", "Number of Periods (years, months…)", { default: 5, min: 0, max: 10000, step: 0.1 }), numberField("projectPeriods", "Periods to Project Ahead", { default: 5, max: 10000, step: 1, required: false })],
    calcResult: { label: "Compound Growth Rate", format: "percentage" },
    calcResults: [pct("totalGrowth", "Total Growth"), pct("simpleAveragePerPeriod", "Simple Average per Period"), pct("compoundGrowthRate", "Compound Growth Rate per Period", true), pct("continuousGrowthRate", "Continuous (Exponential) Rate"), num("doublingTime", "Doubling Time (periods)"), num("projectedValue", "Projected Value")],
    instructions: "Enter a starting and ending value — sales, users, population, prices — and the number of periods between them. The compound rate is the steady rate per period that turns the start into the end; for yearly investment returns use the CAGR calculator.",
    examples: "Example: growth from 1,000 to 1,500 over 5 years is 50% in total, 10% a year on a simple average, but 8.45% a year compounded. At that pace it doubles every 8.55 years and reaches 2,250 five years later.",
    assumptions: "Compound rate = (end ÷ start)^(1/n) − 1; continuous rate = ln(end ÷ start) ÷ n (used for population growth); doubling time = ln 2 ÷ ln(1 + rate). The projection assumes the compound rate continues.",
    faq: [
      { question: "Why is the simple average higher than the compound rate?", answer: "The simple average ignores compounding — growth on growth — so it overstates the steady rate." },
      { question: "How do I calculate a population growth rate?", answer: "Use the continuous rate for populations, or the compound rate per year; both are shown." },
    ],
  },
];

// Every sub-category here hangs directly under Finance Calculators and is
// created on first use.
async function ensureCategory(cat: { name: string; slug: string }) {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: cat.slug } });
  if (existing) return existing;
  const finance = await prisma.toolCategory.findFirst({ where: { slug: { in: FINANCE_SLUGS } } });
  if (!finance) throw new Error(`The "finance-calculators" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first.`);
  console.log(`Creating sub-category "${cat.name}" under "${finance.name}".`);
  return prisma.toolCategory.create({
    data: { name: cat.name, slug: cat.slug, parentId: finance.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const category = await ensureCategory(def.category);
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

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated.`);
  console.log(
    "New tools are created with status Draft — open them in /admin/tools, review, and set Status to Published " +
      "when you're happy with each one."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
