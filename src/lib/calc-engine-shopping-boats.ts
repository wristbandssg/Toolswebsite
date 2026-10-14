/**
 * Batch: "Shopping Calculators" → Boat Calculators (2 tools). The other two
 * names in the user's list already exist: boat-insurance-calculator
 * (create-ins-auto-specialty) and boat-total-cost-of-ownership-calculator
 * (create-car-ownership, titled "Boat Cost of Ownership").
 *
 * Near-namesakes, and how each is deliberately different:
 *  - boatValueCalculator: what a boat is worth TODAY — type-based age curve
 *    from the new price, adjusted for condition, engine hours vs normal use,
 *    upgrades and trailer; gives private-party, trade-in and dealer prices.
 *  - boatDepreciationCalculator: how much value you will LOSE while you own
 *    it — from your purchase price and the boat's age when bought, over the
 *    years you plan to keep it; gives end value, total/annual loss and the
 *    depreciation cost per hour on the water.
 *  - boat-total-cost-of-ownership-calculator (existing): all running costs
 *    together (one flat depreciation rate + fuel, slip, insurance, upkeep).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-boats-calculators.ts for the tool content/copy
 * this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const whole = (v: number, d = 0) => Math.max(0, Math.round(safeNumber(v, d)));

/**
 * Typical yearly value loss by boat type, as fractions:
 * [first year, years 2–10, after year 10]. Dropdown value = index.
 */
const BOAT_TYPE_RATES: [number, number, number][] = [
  [0.15, 0.07, 0.04], // 0 Fishing / bass boat
  [0.18, 0.08, 0.04], // 1 Pontoon
  [0.18, 0.08, 0.04], // 2 Bowrider / runabout / ski boat
  [0.12, 0.06, 0.03], // 3 Center console
  [0.2, 0.08, 0.05], // 4 Cabin cruiser / motor yacht
  [0.1, 0.05, 0.03], // 5 Sailboat
  [0.2, 0.1, 0.06], // 6 Personal watercraft (jet ski)
];

/** Share of the new price a boat keeps at a whole-number age. */
function retention(type: number, age: number): number {
  const [first, mid, late] = BOAT_TYPE_RATES[Math.min(BOAT_TYPE_RATES.length - 1, whole(type))];
  let r = 1;
  for (let year = 1; year <= age; year++) r *= 1 - (year === 1 ? first : year <= 10 ? mid : late);
  return r;
}

const CONDITION_FACTORS = [1.1, 1, 0.85, 0.65]; // Excellent, Good, Fair, Poor
const NORMAL_HOURS_PER_YEAR = 50;
const UPGRADE_RECOVERY = 0.5;

export const boatValueCalculator: CustomCalculator = (v) => {
  const newPrice = nonNeg(v.newPrice);
  const age = Math.min(60, whole(v.age));
  const condition = CONDITION_FACTORS[Math.min(3, whole(v.condition, 1))];
  const hours = nonNeg(v.engineHours);
  const normalHours = Math.max(age, 0.5) * NORMAL_HOURS_PER_YEAR;
  // ±10% value for every 100% above/below normal hours, held to 0.75–1.10.
  const hoursFactor = Math.min(1.1, Math.max(0.75, 1 - 0.1 * (hours / normalHours - 1)));
  const ageValue = newPrice * retention(v.boatType, age);
  const boatValue = ageValue * condition * hoursFactor;
  const extras = nonNeg(v.upgradesValue) * UPGRADE_RECOVERY + nonNeg(v.trailerValue);
  const privatePartyValue = boatValue + extras;
  return {
    privatePartyValue: round2(privatePartyValue),
    tradeInValue: round2(privatePartyValue * 0.8),
    dealerRetailValue: round2(privatePartyValue * 1.15),
    ageOnlyValue: round2(ageValue),
    percentOfNewPrice: newPrice > 0 ? round2((boatValue / newPrice) * 100) : 0,
    normalEngineHours: round2(normalHours),
  };
};

export const boatDepreciationCalculator: CustomCalculator = (v) => {
  const price = nonNeg(v.purchasePrice);
  const ageAtPurchase = Math.min(60, whole(v.ageAtPurchase));
  const years = Math.min(40, whole(v.yearsOwned, 1));
  const type = v.boatType;
  const start = retention(type, ageAtPurchase);
  const endValue = price * (retention(type, ageAtPurchase + years) / start);
  const firstYearValue = price * (retention(type, ageAtPurchase + Math.min(1, years)) / start);
  const total = price - endValue;
  const totalHours = nonNeg(v.hoursPerYear) * years;
  return {
    valueAtSale: round2(endValue),
    totalDepreciation: round2(total),
    percentLost: price > 0 ? round2((total / price) * 100) : 0,
    averageYearlyDepreciation: years > 0 ? round2(total / years) : 0,
    firstYearDepreciation: round2(price - firstYearValue),
    depreciationPerHour: totalHours > 0 ? round2(total / totalHours) : 0,
  };
};

export const shoppingBoatsCustomCalculators: Record<string, CustomCalculator> = {
  "boat-value-calculator": boatValueCalculator,
  "boat-depreciation-calculator": boatDepreciationCalculator,
};
