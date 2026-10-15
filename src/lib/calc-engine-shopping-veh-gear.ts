/**
 * Batch: "Shopping Calculators" → Vehicle, Resale & Collectibles — used electronics, home goods and instrument value
 * (14 tools). One shared depreciation model with per-tool curves:
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
 * See prisma/create-shopping-veh-gear-calculators.ts for the copy.
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
  "used-phone-value-calculator": { curve: [0.35, 0.2, 0.05], usage: [0, 0], trade: 0.7, retail: 1.35 },
  "iphone-resale-value-calculator": { curve: [0.25, 0.15, 0.08], usage: [0, 0], trade: 0.7, retail: 1.3 },
  "used-laptop-value-calculator": { curve: [0.3, 0.2, 0.05], usage: [0, 0], trade: 0.65, retail: 1.3 },
  "used-appliance-value-calculator": { curve: [0.3, 0.1, 0.05], usage: [0, 0], trade: 0.6, retail: 1.4 },
  "appliance-depreciation-calculator": { curve: ["straight", 0, 0.1], usage: [0, 0], trade: 0.6, retail: 1 },
  "used-furniture-value-depreciation-calculator": { curve: [0.5, 0.1, 0.05], usage: [0, 0], trade: 0.6, retail: 1.25 },
  "used-hot-tub-value-calculator": { curve: [0.3, 0.08, 0.05], usage: [0, 0], trade: 0.75, retail: 1.4 },
  "used-mattress-price-calculator": { curve: [0.55, 0.15, 0.02], usage: [0, 0], trade: 0.7, retail: 1.15 },
  "guitar-value-calculator": { curve: [0.25, 0.02, 0.4], usage: [0, 0], trade: 0.55, retail: 1.25 },
  "piano-value-calculator": { curve: [0.2, 0.04, 0.1], usage: [0, 0], trade: 0.6, retail: 1.4 },
  "clarinet-value-calculator": { curve: [0.3, 0.05, 0.15], usage: [0, 0], trade: 0.55, retail: 1.3 },
  "watch-value-calculator": { curve: [0.2, -0.02, 0.3], usage: [0, 0], trade: 0.8, retail: 1.15 },
  "clothing-resale-calculator": { curve: [0.6, 0.1, 0.05], usage: [0, 0], trade: 0.35, retail: 1.2 },
  "wedding-dress-resale-calculator": { curve: [0.5, 0.1, 0.1], usage: [0, 0], trade: 0.6, retail: 1.15 },
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

export const shoppingVehGearCustomCalculators: Record<string, CustomCalculator> = Object.fromEntries(
  Object.keys(PARAMS).map((slug) => [slug, valueTool(slug)])
);
