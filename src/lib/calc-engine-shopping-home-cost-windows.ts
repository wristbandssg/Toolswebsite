/**
 * Batch: "Shopping Calculators" → Home Improvement Cost & Sizing — window, door and furnishing cost
 * (10 tools). Every tool uses the same estimating method with its own
 * 2026 US price tiers (material and labor per unit for budget, mid-range
 * and premium options), so each page prices its own job:
 *
 *   total = quantity × (material + labor for the tier) × complexity
 *           × regional factor + removal × quantity + fixed costs
 *
 * with a low/high range of −15% / +20% for typical quotes. Tier labels,
 * units and the meaning of the complexity, removal and fixed-cost inputs
 * are set per tool in prisma/create-shopping-home-cost-windows-calculators.ts.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));

/** slug → [material, labor] per unit for tiers 0 (budget), 1 (mid), 2 (premium). */
const RATES: Record<string, [number, number][]> = {
  "window-replacement-cost-calculator": [[450, 200], [750, 300], [1100, 400]],
  "window-screen-replacement-cost-calculator": [[10, 15], [25, 25], [80, 70]],
  "home-window-tint-cost-calculator": [[3, 3], [5, 5], [8, 7]],
  "blinds-cost-calculator": [[30, 20], [70, 30], [200, 50]],
  "shutters-cost-calculator": [[250, 75], [400, 100], [600, 150]],
  "curtain-cost-calculator": [[80, 20], [250, 50], [600, 100]],
  "glass-price-calculator": [[8, 4], [15, 6], [20, 8]],
  "bifold-door-cost-calculator": [[80, 100], [200, 120], [350, 150]],
  "sliding-door-cost-calculator": [[1200, 500], [2200, 600], [5000, 1500]],
  "office-furniture-cost-calculator": [[600, 50], [1200, 100], [2500, 200]],
};

function costTool(slug: string): CustomCalculator {
  const rates = RATES[slug];
  return (v) => {
    const qty = nonNeg(v.quantity);
    const [mat, lab] = rates[Math.min(rates.length - 1, Math.max(0, Math.round(safeNumber(v.tier, 1))))];
    const complexity = safeNumber(v.complexity) > 0 ? safeNumber(v.complexity) : 1;
    const region = safeNumber(v.regionFactor) > 0 ? safeNumber(v.regionFactor) / 100 : 1;
    const material = qty * mat * region;
    const labor = qty * lab * complexity * region;
    const extras = qty * nonNeg(v.removalPerUnit) * region + nonNeg(v.fixedCosts);
    const total = material + labor + extras;
    return {
      totalCost: round2(total),
      materialCost: round2(material),
      laborCost: round2(labor),
      extrasCost: round2(extras),
      costPerUnit: qty > 0 ? round2(total / qty) : 0,
      lowEstimate: round2(total * 0.85),
      highEstimate: round2(total * 1.2),
    };
  };
}

export const shoppingHomeCostWindowsCustomCalculators: Record<string, CustomCalculator> = Object.fromEntries(
  Object.keys(RATES).map((slug) => [slug, costTool(slug)])
);
