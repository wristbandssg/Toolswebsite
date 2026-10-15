/**
 * Batch: "Shopping Calculators" → Vehicle, Resale & Collectibles — vehicle and equipment value
 * (15 tools). One shared depreciation model with per-tool curves:
 *
 *  value = price × retention(age) × condition × usage adjustment × option
 *
 * retention(age) drops linearly by the first-year rate during year one, then
 * declines (or, for a negative rate, grows) by the annual rate, never below
 * the floor. "straight" curves use straight-line depreciation over a useful
 * life taken from the option dropdown. Usage (miles or hours) is compared
 * with a typical yearly amount; 0 means "not entered".
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-veh-values-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));

type Curve = [number | "straight", number, number];
type Params = { curve: Curve; usage: [number, number]; trade: number; retail: number };

const PARAMS: Record<string, Params> = {
  "car-value-calculator": { curve: [0.2, 0.12, 0.08], usage: [12000, 0.2], trade: 0.82, retail: 1.15 },
  "truck-value-calculator": { curve: [0.15, 0.09, 0.12], usage: [12000, 0.18], trade: 0.83, retail: 1.15 },
  "used-motorcycle-value-calculator": { curve: [0.2, 0.1, 0.1], usage: [4000, 0.15], trade: 0.75, retail: 1.2 },
  "used-rv-value-calculator": { curve: [0.25, 0.08, 0.1], usage: [5000, 0.1], trade: 0.75, retail: 1.2 },
  "mobile-home-value-calculator": { curve: [0.1, 0.035, 0.2], usage: [0, 0], trade: 0.8, retail: 1.15 },
  "trailer-value-calculator": { curve: [0.15, 0.06, 0.2], usage: [0, 0], trade: 0.8, retail: 1.15 },
  "atv-value-calculator": { curve: [0.2, 0.1, 0.12], usage: [1000, 0.12], trade: 0.75, retail: 1.2 },
  "utv-value-calculator": { curve: [0.2, 0.1, 0.12], usage: [1500, 0.12], trade: 0.75, retail: 1.2 },
  "used-snowmobile-value-calculator": { curve: [0.22, 0.1, 0.1], usage: [1200, 0.12], trade: 0.72, retail: 1.2 },
  "used-golf-cart-value-calculator": { curve: [0.2, 0.07, 0.15], usage: [0, 0], trade: 0.7, retail: 1.25 },
  "used-scooter-value-calculator": { curve: [0.25, 0.12, 0.1], usage: [2500, 0.15], trade: 0.65, retail: 1.2 },
  "used-tractor-value-calculator": { curve: [0.15, 0.06, 0.2], usage: [300, 0.12], trade: 0.82, retail: 1.15 },
  "forklift-value-calculator": { curve: [0.2, 0.1, 0.12], usage: [1500, 0.15], trade: 0.75, retail: 1.25 },
  "school-bus-value-calculator": { curve: [0.2, 0.17, 0.03], usage: [12000, 0.1], trade: 0.8, retail: 1.3 },
  "lawn-mower-value-calculator": { curve: [0.25, 0.1, 0.1], usage: [50, 0.12], trade: 0.8, retail: 1.2 },
};

function retention(curve: Curve, age: number, option: number) {
  if (curve[0] === "straight") {
    const life = option > 0 ? option : 10;
    return Math.max(curve[2], 1 - age / life);
  }
  const [first, annual, floor] = curve as [number, number, number];
  const r = age < 1 ? 1 - first * age : (1 - first) * Math.pow(1 - annual, age - 1);
  return Math.max(floor, r);
}

function valueTool(slug: string): CustomCalculator {
  const p = PARAMS[slug];
  return (v) => {
    const price = nonNeg(v.originalPrice);
    const age = nonNeg(v.ageYears);
    const straight = p.curve[0] === "straight";
    const option = safeNumber(v.option) > 0 ? safeNumber(v.option) : straight ? 10 : 1;
    const condition = safeNumber(v.condition) > 0 ? safeNumber(v.condition) : 1;
    let usageAdj = 1;
    const used = nonNeg(v.usage);
    if (p.usage[0] > 0 && used > 0) {
      const ratio = used / (p.usage[0] * Math.max(age, 0.5));
      usageAdj = Math.min(1.12, Math.max(0.75, 1 - p.usage[1] * (ratio - 1)));
    }
    const value = price * retention(p.curve, age, option) * condition * usageAdj * (straight ? 1 : option);
    return {
      estimatedValue: round2(value),
      tradeInValue: round2(value * p.trade),
      dealerRetailValue: round2(straight ? price - value : value * p.retail),
      totalDepreciation: round2(price - value),
      percentRetained: price > 0 ? round2((value / price) * 100) : 0,
      averagePerYear: age > 0 ? round2((price - value) / age) : 0,
    };
  };
}

export const shoppingVehValuesCustomCalculators: Record<string, CustomCalculator> = Object.fromEntries(
  Object.keys(PARAMS).map((slug) => [slug, valueTool(slug)])
);
