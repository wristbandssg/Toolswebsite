/**
 * Batch: "Finance Calculators — Business, Investment & Economics" (14 Oct
 * 2026), sub-batch 3 of 5 — Economics (11 tools). See
 * calc-engine-fin-valuation.ts for the full batch context.
 *
 * The three elasticity tools are deliberately different: price elasticity
 * uses the good's own price and quantity, income elasticity uses consumer
 * income, and cross-price elasticity uses the price of ANOTHER good. All use
 * the midpoint (arc) formula by default, with the simple % change formula as
 * an option.
 *
 *  - priceElasticityOfDemand: %ΔQ ÷ %ΔP, the class (elastic / unit /
 *    inelastic) and the change in total revenue.
 *  - incomeElasticityOfDemand: %ΔQ ÷ %ΔIncome -> luxury / necessity /
 *    inferior good.
 *  - crossPriceElasticity: %ΔQa ÷ %ΔPb -> substitutes / complements.
 *  - consumerSurplus: linear demand — ½·Q·(choke price − price); producer
 *    surplus ½·Q·(price − lowest supply price).
 *  - mpc: ΔC ÷ ΔY, MPS = 1 − MPC, spending multiplier 1/(1 − MPC), tax
 *    multiplier −MPC/(1 − MPC), and the GDP effect of a spending change.
 *  - deadweightLoss: ½ × price wedge (tax) × lost quantity, tax revenue.
 *  - comparativeAdvantage: two producers, two goods (output per period);
 *    opportunity costs, absolute and comparative advantage, terms of trade.
 *  - gdp: expenditure approach C + I + G + (X − M), real GDP via deflator.
 *  - gdpPerCapita: GDP ($ billions) ÷ population (millions), growth.
 *  - unemploymentRate: unemployed ÷ labor force, participation rate,
 *    employment-population ratio.
 *  - growthRate: total % change, simple average, compound (geometric) and
 *    continuous rates per period, doubling time and a projection. Different
 *    from the existing cagr-calculator (annual investment return only).
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin-economics-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const round4 = (n: number) => Math.round(n * 10000) / 10000;
const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));
const num = (v: number, d: number) => safeNumber(v, d);

/** % change from a to b: midpoint (arc) when method = 1, simple otherwise. */
function pctChange(a: number, b: number, method: number): number {
  const base = method === 2 ? a : (a + b) / 2;
  return base !== 0 ? ((b - a) / base) * 100 : 0;
}

// --- 1. Price Elasticity of Demand Calculator ------------------------------------------
export const priceElasticityOfDemandCalculator: CustomCalculator = (values) => {
  const p1 = pos(values.initialPrice, 10);
  const p2 = pos(values.newPrice, 12);
  const q1 = pos(values.initialQuantity, 1000);
  const q2 = pos(values.newQuantity, 800);
  const m = num(values.method, 1);
  const dq = pctChange(q1, q2, m);
  const dp = pctChange(p1, p2, m);
  const e = dp !== 0 ? dq / dp : 0;
  const a = Math.abs(e);
  return {
    pctChangeQuantity: round2(dq),
    pctChangePrice: round2(dp),
    elasticity: round4(e),
    absoluteElasticity: round4(a),
    // 1 elastic, 2 unit elastic, 3 inelastic, 4 perfectly inelastic
    classification: a === 0 ? 4 : Math.abs(a - 1) < 0.005 ? 2 : a > 1 ? 1 : 3,
    revenueChange: round2(p2 * q2 - p1 * q1),
  };
};

// --- 2. Income Elasticity of Demand Calculator -----------------------------------------
export const incomeElasticityOfDemandCalculator: CustomCalculator = (values) => {
  const i1 = pos(values.initialIncome, 50000);
  const i2 = pos(values.newIncome, 60000);
  const q1 = pos(values.initialQuantity, 20);
  const q2 = pos(values.newQuantity, 26);
  const m = num(values.method, 1);
  const dq = pctChange(q1, q2, m);
  const di = pctChange(i1, i2, m);
  const e = di !== 0 ? dq / di : 0;
  return {
    pctChangeQuantity: round2(dq),
    pctChangeIncome: round2(di),
    incomeElasticity: round4(e),
    // 1 luxury (> 1), 2 normal necessity (0–1), 3 inferior (< 0), 4 no effect
    goodType: e > 1 ? 1 : e > 0 ? 2 : e < 0 ? 3 : 4,
  };
};

// --- 3. Cross Price Elasticity Calculator ----------------------------------------------
export const crossPriceElasticityCalculator: CustomCalculator = (values) => {
  const pb1 = pos(values.initialPriceB, 4);
  const pb2 = pos(values.newPriceB, 5);
  const qa1 = pos(values.initialQuantityA, 500);
  const qa2 = pos(values.newQuantityA, 560);
  const m = num(values.method, 1);
  const dq = pctChange(qa1, qa2, m);
  const dp = pctChange(pb1, pb2, m);
  const e = dp !== 0 ? dq / dp : 0;
  return {
    pctChangeQuantityA: round2(dq),
    pctChangePriceB: round2(dp),
    crossElasticity: round4(e),
    // 1 substitutes, 2 complements, 3 unrelated
    relationship: Math.abs(e) < 0.005 ? 3 : e > 0 ? 1 : 2,
  };
};

// --- 4. Consumer Surplus Calculator ----------------------------------------------------
export const consumerSurplusCalculator: CustomCalculator = (values) => {
  const choke = pos(values.maxPrice, 50);
  const price = pos(values.marketPrice, 30);
  const q = pos(values.quantity, 400);
  const minSupply = pos(values.minSupplyPrice, 10);
  const cs = 0.5 * q * Math.max(0, choke - price);
  const ps = 0.5 * q * Math.max(0, price - minSupply);
  return {
    consumerSurplus: round2(cs),
    producerSurplus: round2(ps),
    totalSurplus: round2(cs + ps),
    totalSpending: round2(price * q),
    surplusPerUnit: round2(q > 0 ? cs / q : 0),
  };
};

// --- 5. MPC Calculator -----------------------------------------------------------------
export const mpcCalculator: CustomCalculator = (values) => {
  const y1 = num(values.initialIncome, 40000);
  const y2 = num(values.newIncome, 45000);
  const c1 = num(values.initialConsumption, 32000);
  const c2 = num(values.newConsumption, 36000);
  const dG = num(values.spendingChange, 0);
  const dy = y2 - y1;
  const mpc = dy !== 0 ? (c2 - c1) / dy : 0;
  const mps = 1 - mpc;
  const mult = mps > 0 ? 1 / mps : 0;
  return {
    changeInIncome: round2(dy),
    changeInConsumption: round2(c2 - c1),
    mpc: round4(mpc),
    mps: round4(mps),
    spendingMultiplier: round2(mult),
    taxMultiplier: round2(mps > 0 ? -mpc / mps : 0),
    gdpImpact: round2(dG * mult),
  };
};

// --- 6. Deadweight Loss Calculator -----------------------------------------------------
export const deadweightLossCalculator: CustomCalculator = (values) => {
  const q0 = pos(values.originalQuantity, 1000);
  const q1 = pos(values.newQuantity, 800);
  const wedge = pos(values.priceWedge, 5);
  const p0 = pos(values.originalPrice, 0);
  const dq = Math.abs(q0 - q1);
  const dwl = 0.5 * wedge * dq;
  const revenue = wedge * Math.min(q0, q1);
  return {
    quantityLost: round2(dq),
    deadweightLoss: round2(dwl),
    taxRevenue: round2(revenue),
    dwlPerDollarOfRevenue: round2(revenue > 0 ? dwl / revenue : 0),
    dwlShareOfMarket: round2(p0 > 0 && q0 > 0 ? (dwl / (p0 * q0)) * 100 : 0),
  };
};

// --- 7. Comparative Advantage Calculator -----------------------------------------------
export const comparativeAdvantageCalculator: CustomCalculator = (values) => {
  const ax = pos(values.producerAGoodX, 40);
  const ay = pos(values.producerAGoodY, 20);
  const bx = pos(values.producerBGoodX, 30);
  const by = pos(values.producerBGoodY, 30);
  const ocAx = ax > 0 ? ay / ax : 0;
  const ocBx = bx > 0 ? by / bx : 0;
  const ocAy = ay > 0 ? ax / ay : 0;
  const ocBy = by > 0 ? bx / by : 0;
  const caX = ocAx === ocBx ? 0 : ocAx < ocBx ? 1 : 2;
  return {
    oppCostAofX: round4(ocAx),
    oppCostAofY: round4(ocAy),
    oppCostBofX: round4(ocBx),
    oppCostBofY: round4(ocBy),
    // 0 none, 1 producer A, 2 producer B
    comparativeAdvantageX: caX,
    comparativeAdvantageY: caX === 0 ? 0 : caX === 1 ? 2 : 1,
    absoluteAdvantageX: ax === bx ? 0 : ax > bx ? 1 : 2,
    absoluteAdvantageY: ay === by ? 0 : ay > by ? 1 : 2,
    termsOfTradeMin: round4(Math.min(ocAx, ocBx)),
    termsOfTradeMax: round4(Math.max(ocAx, ocBx)),
  };
};

// --- 8. GDP Calculator -----------------------------------------------------------------
export const gdpCalculator: CustomCalculator = (values) => {
  const c = num(values.consumption, 19000);
  const i = num(values.investment, 5200);
  const g = num(values.government, 4900);
  const x = num(values.exports, 3200);
  const m = num(values.imports, 4100);
  const deflator = pos(values.gdpDeflator, 0);
  const gdp = c + i + g + x - m;
  return {
    netExports: round2(x - m),
    nominalGdp: round2(gdp),
    realGdp: round2(deflator > 0 ? (gdp / deflator) * 100 : gdp),
    consumptionShare: round2(gdp !== 0 ? (c / gdp) * 100 : 0),
    investmentShare: round2(gdp !== 0 ? (i / gdp) * 100 : 0),
    governmentShare: round2(gdp !== 0 ? (g / gdp) * 100 : 0),
  };
};

// --- 9. GDP Per Capita Calculator ------------------------------------------------------
export const gdpPerCapitaCalculator: CustomCalculator = (values) => {
  const gdpBn = pos(values.gdpBillions, 30000);
  const popMn = pos(values.populationMillions, 342);
  const prior = pos(values.priorPerCapita, 0);
  const pc = popMn > 0 ? (gdpBn * 1000) / popMn : 0;
  return {
    gdpPerCapita: round2(pc),
    gdpPerCapitaMonthly: round2(pc / 12),
    gdpPerCapitaDaily: round2(pc / 365),
    growthVsPrior: round2(prior > 0 ? (pc / prior - 1) * 100 : 0),
  };
};

// --- 10. Unemployment Rate Calculator --------------------------------------------------
export const unemploymentRateCalculator: CustomCalculator = (values) => {
  const unemployed = pos(values.unemployed, 7.4);
  const employed = pos(values.employed, 163);
  const pop = pos(values.workingAgePopulation, 274);
  const lf = unemployed + employed;
  return {
    laborForce: round2(lf),
    unemploymentRate: round2(lf > 0 ? (unemployed / lf) * 100 : 0),
    employmentRate: round2(lf > 0 ? (employed / lf) * 100 : 0),
    participationRate: round2(pop > 0 ? (lf / pop) * 100 : 0),
    employmentPopulationRatio: round2(pop > 0 ? (employed / pop) * 100 : 0),
    notInLaborForce: round2(pop > 0 ? Math.max(0, pop - lf) : 0),
  };
};

// --- 11. Growth Rate Calculator --------------------------------------------------------
export const growthRateCalculator: CustomCalculator = (values) => {
  const a = pos(values.startValue, 1000);
  const b = pos(values.endValue, 1500);
  const n = pos(values.periods, 5);
  const ahead = pos(values.projectPeriods, 5);
  const total = a > 0 ? (b / a - 1) * 100 : 0;
  const compound = a > 0 && b > 0 && n > 0 ? Math.pow(b / a, 1 / n) - 1 : 0;
  const continuous = a > 0 && b > 0 && n > 0 ? Math.log(b / a) / n : 0;
  return {
    totalGrowth: round2(total),
    simpleAveragePerPeriod: round2(n > 0 ? total / n : 0),
    compoundGrowthRate: round2(compound * 100),
    continuousGrowthRate: round2(continuous * 100),
    doublingTime: round2(compound > 0 ? Math.log(2) / Math.log(1 + compound) : 0),
    projectedValue: round2(b * Math.pow(1 + compound, ahead)),
  };
};

export const finEconomicsCustomCalculators: Record<string, CustomCalculator> = {
  "price-elasticity-of-demand-calculator": priceElasticityOfDemandCalculator,
  "income-elasticity-of-demand-calculator": incomeElasticityOfDemandCalculator,
  "cross-price-elasticity-calculator": crossPriceElasticityCalculator,
  "consumer-surplus-calculator": consumerSurplusCalculator,
  "mpc-calculator": mpcCalculator,
  "deadweight-loss-calculator": deadweightLossCalculator,
  "comparative-advantage-calculator": comparativeAdvantageCalculator,
  "gdp-calculator": gdpCalculator,
  "gdp-per-capita-calculator": gdpPerCapitaCalculator,
  "unemployment-rate-calculator": unemploymentRateCalculator,
  "growth-rate-calculator": growthRateCalculator,
};
