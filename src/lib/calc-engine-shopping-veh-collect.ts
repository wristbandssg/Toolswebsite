/**
 * Batch: "Shopping Calculators" → Vehicle, Resale & Collectibles —
 * collectibles (12 tools). One shared comparable-sales model:
 *
 *  value = base sold price × quantity × grade × factor A × factor B × channel
 *
 * The base is a recent sold price for the same item in a reference
 * condition (raw near mint, mint in box, complete in box, retail, $/sq ft);
 * the dropdowns carry multipliers. Net = value − selling fees − shipping −
 * grading / authentication / appraisal cost.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-veh-collect-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const mult = (v: number) => (safeNumber(v) > 0 ? safeNumber(v) : 1);

export const collectibleValue: CustomCalculator = (v) => {
  const qty = v.quantity === undefined ? 1 : nonNeg(v.quantity);
  const base = nonNeg(v.basePrice) * qty;
  const value = base * mult(v.grade) * mult(v.factorA) * mult(v.factorB) * mult(v.channel);
  const fees = (value * nonNeg(v.feeRate)) / 100;
  return {
    estimatedValue: round2(value),
    lowEstimate: round2(value * 0.8),
    highEstimate: round2(value * 1.25),
    sellingFees: round2(fees),
    netAfterFees: round2(value - fees - nonNeg(v.shippingCost) - nonNeg(v.gradingCost)),
    multipleOfBase: base > 0 ? round2(value / base) : 0,
  };
};

export const shoppingVehCollectCustomCalculators: Record<string, CustomCalculator> = {
  "pokemon-card-value-calculator": collectibleValue,
  "baseball-card-value-calculator": collectibleValue,
  "funko-pop-value-calculator": collectibleValue,
  "hot-wheels-value-calculator": collectibleValue,
  "comic-book-value-calculator": collectibleValue,
  "video-game-value-calculator": collectibleValue,
  "dvd-value-calculator": collectibleValue,
  "cd-value-calculator": collectibleValue,
  "autograph-value-calculator": collectibleValue,
  "antique-furniture-value-calculator": collectibleValue,
  "persian-rug-value-calculator": collectibleValue,
  "sneaker-resale-value-calculator": collectibleValue,
};
