/**
 * Batch: "Shopping Calculators" → Home Improvement Cost & Sizing — wall, ceiling and flooring cost
 * (14 tools). Every tool uses the same estimating method with its own
 * 2026 US price tiers (material and labor per unit for budget, mid-range
 * and premium options), so each page prices its own job:
 *
 *   total = quantity × (material + labor for the tier) × complexity
 *           × regional factor + removal × quantity + fixed costs
 *
 * with a low/high range of −15% / +20% for typical quotes. Tier labels,
 * units and the meaning of the complexity, removal and fixed-cost inputs
 * are set per tool in prisma/create-shopping-home-cost-surfaces-calculators.ts.
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
  "interior-painting-cost-calculator": [[1, 2], [1.5, 3], [2, 4]],
  "exterior-painting-cost-calculator": [[0.7, 1.8], [1, 2.5], [1.3, 3.7]],
  "popcorn-ceiling-removal-cost-calculator": [[0.3, 1.2], [0.8, 2.7], [2, 5]],
  "drywall-cost-calculator": [[0.6, 1], [0.7, 2.3], [0.8, 2.7]],
  "insulation-cost-calculator": [[0.7, 0.6], [0.9, 0.8], [2, 2]],
  "wallpaper-cost-calculator": [[1.5, 1.5], [2, 3], [5, 5]],
  "tile-cost-calculator": [[3, 7], [5, 9], [10, 12]],
  "flooring-cost-calculator": [[2, 2], [3.5, 2.5], [7, 5]],
  "laminate-flooring-cost-calculator": [[1.5, 2], [2.5, 2.5], [4, 3]],
  "hardwood-floor-cost-calculator": [[5, 4], [6, 5], [10, 6]],
  "vinyl-plank-flooring-cost-calculator": [[2, 2], [3, 2.5], [4.5, 3]],
  "epoxy-floor-cost-calculator": [[2, 2.5], [3, 4], [5, 6]],
  "floor-refinishing-cost-calculator": [[0.5, 1], [1, 3], [1.5, 4]],
  "carpet-cost-calculator": [[2, 1], [3.5, 1.5], [7, 2]],
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

export const shoppingHomeCostSurfacesCustomCalculators: Record<string, CustomCalculator> = Object.fromEntries(
  Object.keys(RATES).map((slug) => [slug, costTool(slug)])
);
