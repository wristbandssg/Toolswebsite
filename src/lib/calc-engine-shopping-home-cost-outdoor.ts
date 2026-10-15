/**
 * Batch: "Shopping Calculators" → Home Improvement Cost & Sizing — pool and outdoor living cost
 * (11 tools). Every tool uses the same estimating method with its own
 * 2026 US price tiers (material and labor per unit for budget, mid-range
 * and premium options), so each page prices its own job:
 *
 *   total = quantity × (material + labor for the tier) × complexity
 *           × regional factor + removal × quantity + fixed costs
 *
 * with a low/high range of −15% / +20% for typical quotes. Tier labels,
 * units and the meaning of the complexity, removal and fixed-cost inputs
 * are set per tool in prisma/create-shopping-home-cost-outdoor-calculators.ts.
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
  "pool-cost-calculator": [[55, 45], [70, 50], [95, 80]],
  "pool-screen-enclosure-cost-calculator": [[6, 5], [8, 7], [14, 11]],
  "pool-cover-cost-calculator": [[3, 1], [4, 1.5], [20, 10]],
  "pool-liner-cost-calculator": [[2, 1.5], [2.8, 1.7], [3.6, 2]],
  "hot-tub-cost-calculator": [[600, 0], [4500, 500], [9000, 1000]],
  "sprinkler-system-cost-calculator": [[0.25, 0.35], [0.4, 0.5], [0.6, 0.7]],
  "outdoor-kitchen-cost-calculator": [[400, 200], [800, 400], [1600, 700]],
  "patio-cost-calculator": [[5, 5], [10, 10], [15, 15]],
  "paver-cost-calculator": [[6, 9], [9, 11], [15, 13]],
  "pergola-cost-calculator": [[20, 15], [30, 20], [60, 30]],
  "dock-cost-calculator": [[25, 20], [35, 30], [50, 40]],
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

export const shoppingHomeCostOutdoorCustomCalculators: Record<string, CustomCalculator> = Object.fromEntries(
  Object.keys(RATES).map((slug) => [slug, costTool(slug)])
);
