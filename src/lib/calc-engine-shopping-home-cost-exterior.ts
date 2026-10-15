/**
 * Batch: "Shopping Calculators" → Home Improvement Cost & Sizing — exterior and yard cost
 * (12 tools). Every tool uses the same estimating method with its own
 * 2026 US price tiers (material and labor per unit for budget, mid-range
 * and premium options), so each page prices its own job:
 *
 *   total = quantity × (material + labor for the tier) × complexity
 *           × regional factor + removal × quantity + fixed costs
 *
 * with a low/high range of −15% / +20% for typical quotes. Tier labels,
 * units and the meaning of the complexity, removal and fixed-cost inputs
 * are set per tool in prisma/create-shopping-home-cost-exterior-calculators.ts.
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
  "roof-replacement-cost-calculator": [[1.6, 2.4], [2.3, 2.7], [6, 5]],
  "fence-cost-calculator": [[10, 8], [18, 14], [25, 12]],
  "deck-cost-calculator": [[15, 15], [25, 17], [35, 20]],
  "retaining-wall-cost-calculator": [[15, 15], [20, 20], [35, 35]],
  "landscaping-cost-calculator": [[2, 2], [5, 5], [12, 12]],
  "siding-cost-calculator": [[3.5, 3.5], [5, 4], [6, 6]],
  "gutter-cost-calculator": [[3, 3], [6, 6], [20, 10]],
  "gutter-guard-cost-calculator": [[3, 2], [8, 7], [15, 15]],
  "hail-damage-repair-cost-calculator": [[1, 1.5], [2, 2.5], [2.3, 2.7]],
  "artificial-turf-cost-calculator": [[3, 4], [5, 5], [8, 6]],
  "concrete-price-calculator": [[3.5, 3], [5, 4], [8, 7]],
  "concrete-stain-cost-calculator": [[0.5, 1], [1.5, 2.5], [3, 4]],
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

export const shoppingHomeCostExteriorCustomCalculators: Record<string, CustomCalculator> = Object.fromEntries(
  Object.keys(RATES).map((slug) => [slug, costTool(slug)])
);
