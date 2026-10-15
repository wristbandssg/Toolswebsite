/**
 * Batch: "Shopping Calculators" → Home Improvement Cost & Sizing — addition, outbuilding and systems cost
 * (15 tools). Every tool uses the same estimating method with its own
 * 2026 US price tiers (material and labor per unit for budget, mid-range
 * and premium options), so each page prices its own job:
 *
 *   total = quantity × (material + labor for the tier) × complexity
 *           × regional factor + removal × quantity + fixed costs
 *
 * with a low/high range of −15% / +20% for typical quotes. Tier labels,
 * units and the meaning of the complexity, removal and fixed-cost inputs
 * are set per tool in prisma/create-shopping-home-cost-buildings-calculators.ts.
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
  "home-addition-cost-calculator": [[100, 100], [140, 140], [200, 200]],
  "barndominium-cost-calculator": [[35, 25], [60, 50], [100, 80]],
  "garage-cost-calculator": [[30, 25], [40, 35], [55, 45]],
  "garage-door-cost-calculator": [[800, 300], [1500, 400], [3500, 700]],
  "carport-cost-calculator": [[8, 4], [12, 8], [18, 14]],
  "shed-cost-calculator": [[15, 5], [30, 15], [45, 35]],
  "pole-barn-cost-calculator": [[15, 8], [22, 13], [35, 25]],
  "tiny-house-cost-calculator": [[150, 20], [200, 150], [300, 250]],
  "adu-cost-calculator": [[90, 80], [130, 120], [200, 200]],
  "basement-finishing-cost-calculator": [[17, 18], [27, 28], [42, 43]],
  "wheelchair-ramp-cost-calculator": [[60, 60], [130, 40], [150, 100]],
  "whole-house-generator-cost-calculator": [[300, 200], [450, 250], [550, 300]],
  "chimney-repair-cost-calculator": [[5, 20], [20, 50], [35, 65]],
  "electrician-cost-calculator": [[15, 60], [15, 85], [20, 140]],
  "solar-panel-cost-calculator": [[1600, 1200], [1900, 1300], [2700, 1800]],
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

export const shoppingHomeCostBuildingsCustomCalculators: Record<string, CustomCalculator> = Object.fromEntries(
  Object.keys(RATES).map((slug) => [slug, costTool(slug)])
);
