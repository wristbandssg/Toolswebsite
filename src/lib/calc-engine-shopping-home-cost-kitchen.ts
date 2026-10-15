/**
 * Batch: "Shopping Calculators" → Home Improvement Cost & Sizing — kitchen and bathroom cost
 * (13 tools). Every tool uses the same estimating method with its own
 * 2026 US price tiers (material and labor per unit for budget, mid-range
 * and premium options), so each page prices its own job:
 *
 *   total = quantity × (material + labor for the tier) × complexity
 *           × regional factor + removal × quantity + fixed costs
 *
 * with a low/high range of −15% / +20% for typical quotes. Tier labels,
 * units and the meaning of the complexity, removal and fixed-cost inputs
 * are set per tool in prisma/create-shopping-home-cost-kitchen-calculators.ts.
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
  "kitchen-remodel-cost-calculator": [[80, 70], [160, 140], [280, 220]],
  "bathroom-remodel-cost-calculator": [[70, 80], [150, 150], [280, 270]],
  "shower-remodel-cost-calculator": [[8, 7], [15, 20], [30, 35]],
  "cabinet-refacing-cost-calculator": [[100, 100], [150, 120], [220, 130]],
  "cabinet-painting-refinishing-cost-calculator": [[30, 70], [40, 90], [50, 110]],
  "cabinet-cost-calculator": [[180, 70], [340, 110], [700, 200]],
  "countertop-cost-calculator": [[25, 15], [60, 30], [110, 40]],
  "quartz-countertop-cost-calculator": [[50, 25], [65, 30], [90, 35]],
  "granite-countertop-cost-calculator": [[40, 25], [55, 30], [90, 35]],
  "epoxy-countertop-cost-calculator": [[12, 0], [25, 35], [60, 50]],
  "backsplash-cost-calculator": [[6, 14], [15, 17], [25, 20]],
  "kitchen-island-cost-calculator": [[350, 150], [700, 250], [1300, 500]],
  "frameless-shower-door-cost-calculator": [[30, 15], [35, 20], [45, 30]],
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

export const shoppingHomeCostKitchenCustomCalculators: Record<string, CustomCalculator> = Object.fromEntries(
  Object.keys(RATES).map((slug) => [slug, costTool(slug)])
);
